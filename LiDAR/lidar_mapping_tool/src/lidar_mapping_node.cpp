    ！！！/**
 * @file lidar_mapping_node.cpp
 * @brief 2D激光雷达建图节点 - 实时生成高质量点云地图
 * @author Your Name
 * @date 2024
 */

#include <ros/ros.h>
#include <sensor_msgs/LaserScan.h>
#include <nav_msgs/OccupancyGrid.h>
#include <nav_msgs/Odometry.h>
#include <geometry_msgs/PoseStamped.h>
#include <geometry_msgs/PoseArray.h>
#include <tf/transform_broadcaster.h>
#include <tf/transform_listener.h>

#include "slamProcessor.h"
#include "dataType.h"

#include <opencv2/opencv.hpp>
#include <Eigen/Dense>

class LidarMappingNode
{
public:
    LidarMappingNode() : nh_("~"), first_scan_(true)
    {
        // 读取参数
        nh_.param<std::string>("map_frame", map_frame_, "map");
        nh_.param<std::string>("odom_frame", odom_frame_, "odom");
        nh_.param<std::string>("base_frame", base_frame_, "base_link");
        nh_.param<std::string>("laser_frame", laser_frame_, "laser_frame");
        
        nh_.param<int>("map_size_x", map_size_x_, 2048);
        nh_.param<int>("map_size_y", map_size_y_, 2048);
        nh_.param<float>("map_resolution", map_resolution_, 0.05);
        
        nh_.param<float>("update_distance_threshold", update_distance_threshold_, 0.2);
        nh_.param<float>("update_angle_threshold", update_angle_threshold_, 0.1);
        
        nh_.param<bool>("publish_map_updates", publish_map_updates_, true);
        nh_.param<double>("map_publish_period", map_publish_period_, 1.0);

        // 初始化SLAM处理器
        slam_processor_ = new slam::SlamProcessor(map_size_x_, map_size_y_, map_resolution_);
        slam_processor_->setMinDistanceDiffForMapUpdate(update_distance_threshold_);
        slam_processor_->setMinAngleDiffForMapUpdate(update_angle_threshold_);
        
        // 订阅激光扫描数据
        laser_sub_ = nh_.subscribe("/scan", 10, &LidarMappingNode::laserCallback, this);
        
        // 发布地图和位姿
        map_pub_ = nh_.advertise<nav_msgs::OccupancyGrid>("/map", 1, true);
        pose_pub_ = nh_.advertise<geometry_msgs::PoseStamped>("/slam_pose", 10);
        trajectory_pub_ = nh_.advertise<geometry_msgs::PoseArray>("/trajectory", 1);
        
        // 定时发布地图
        if (publish_map_updates_)
        {
            map_timer_ = nh_.createTimer(ros::Duration(map_publish_period_), 
                                        &LidarMappingNode::mapPublishTimerCallback, this);
        }
        
        // 初始化位姿
        current_pose_ = Eigen::Vector3f::Zero();
        
        ROS_INFO("=================================================");
        ROS_INFO("2D激光雷达建图工具已启动");
        ROS_INFO("地图尺寸: %d x %d", map_size_x_, map_size_y_);
        ROS_INFO("地图分辨率: %.3f m", map_resolution_);
        ROS_INFO("=================================================");
    }
    
    ~LidarMappingNode()
    {
        if (slam_processor_)
        {
            delete slam_processor_;
        }
    }

private:
    void laserCallback(const sensor_msgs::LaserScan::ConstPtr& scan_msg)
    {
        // 转换激光数据到容器
        slam::ScanContainer scan_container;
        convertLaserScanToContainer(scan_msg, scan_container);
        
        if (first_scan_)
        {
            // 处理第一帧
            slam_processor_->processTheFirstScan(current_pose_, scan_container);
            first_scan_ = false;
            
            ROS_INFO("第一帧激光数据已处理，开始建图...");
            
            // 发布初始地图
            publishMap();
        }
        else
        {
            // 更新地图
            slam_processor_->update(current_pose_, scan_container, false);
            
            // 获取更新后的位姿
            current_pose_ = slam_processor_->getLastScanMatchPose();
            
            // 保存轨迹
            trajectory_.push_back(current_pose_);
            
            // 发布位姿
            publishPose();
            publishTrajectory();
            
            // 发布TF变换
            publishTransform();
            
            // 打印信息
            static int scan_count = 0;
            scan_count++;
            if (scan_count % 10 == 0)
            {
                ROS_INFO("已处理 %d 帧激光数据 | 当前位姿: [%.2f, %.2f, %.2f°]", 
                         scan_count, current_pose_(0), current_pose_(1), 
                         current_pose_(2) * 180.0 / M_PI);
            }
        }
    }
    
    void convertLaserScanToContainer(const sensor_msgs::LaserScan::ConstPtr& scan_msg,
                                     slam::ScanContainer& container)
    {
        container.clear();
        
        int num_points = (scan_msg->angle_max - scan_msg->angle_min) / scan_msg->angle_increment;
        
        for (int i = 0; i < num_points; ++i)
        {
            float range = scan_msg->ranges[i];
            
            // 过滤无效点
            if (range < scan_msg->range_min || range > scan_msg->range_max || 
                std::isnan(range) || std::isinf(range))
            {
                continue;
            }
            
            float angle = scan_msg->angle_min + i * scan_msg->angle_increment;
            
            // 转换到笛卡尔坐标
            Eigen::Vector2f point;
            point(0) = range * cos(angle);
            point(1) = range * sin(angle);
            
            container.addData(point);
        }
    }
    
    void publishMap()
    {
        nav_msgs::OccupancyGrid map_msg;
        map_msg.header.stamp = ros::Time::now();
        map_msg.header.frame_id = map_frame_;
        
        // 获取地图信息
        slam::MapInfo map_info = slam_processor_->getMapInfo();
        
        map_msg.info.resolution = map_info.getCellLength();
        map_msg.info.width = map_info.getSizeX();
        map_msg.info.height = map_info.getSizeY();
        
        // 设置地图原点
        Eigen::Vector2f offset = map_info.getOffset();
        map_msg.info.origin.position.x = offset(0);
        map_msg.info.origin.position.y = offset(1);
        map_msg.info.origin.position.z = 0.0;
        map_msg.info.origin.orientation.w = 1.0;
        
        // 获取占据栅格地图数据
        slam::OccupiedMap occupied_map = slam_processor_->getOccupiedMap();
        
        // 填充地图数据
        map_msg.data.resize(map_info.getSizeX() * map_info.getSizeY());
        
        for (int y = 0; y < map_info.getSizeY(); ++y)
        {
            for (int x = 0; x < map_info.getSizeX(); ++x)
            {
                int index = y * map_info.getSizeX() + x;
                
                // 获取栅格占据概率
                float occupancy = occupied_map.getGridProbability(x, y);
                
                // 转换为ROS占据栅格格式 [0, 100]
                if (occupancy < 0.0)
                {
                    map_msg.data[index] = -1;  // 未知
                }
                else if (occupancy > 0.65)
                {
                    map_msg.data[index] = 100;  // 占据
                }
                else if (occupancy < 0.35)
                {
                    map_msg.data[index] = 0;    // 空闲
                }
                else
                {
                    map_msg.data[index] = static_cast<int8_t>(occupancy * 100);
                }
            }
        }
        
        map_pub_.publish(map_msg);
    }
    
    void publishPose()
    {
        geometry_msgs::PoseStamped pose_msg;
        pose_msg.header.stamp = ros::Time::now();
        pose_msg.header.frame_id = map_frame_;
        
        pose_msg.pose.position.x = current_pose_(0);
        pose_msg.pose.position.y = current_pose_(1);
        pose_msg.pose.position.z = 0.0;
        
        tf::Quaternion q;
        q.setRPY(0, 0, current_pose_(2));
        pose_msg.pose.orientation.x = q.x();
        pose_msg.pose.orientation.y = q.y();
        pose_msg.pose.orientation.z = q.z();
        pose_msg.pose.orientation.w = q.w();
        
        pose_pub_.publish(pose_msg);
    }
    
    void publishTrajectory()
    {
        geometry_msgs::PoseArray trajectory_msg;
        trajectory_msg.header.stamp = ros::Time::now();
        trajectory_msg.header.frame_id = map_frame_;
        
        for (const auto& pose : trajectory_)
        {
            geometry_msgs::Pose p;
            p.position.x = pose(0);
            p.position.y = pose(1);
            p.position.z = 0.0;
            
            tf::Quaternion q;
            q.setRPY(0, 0, pose(2));
            p.orientation.x = q.x();
            p.orientation.y = q.y();
            p.orientation.z = q.z();
            p.orientation.w = q.w();
            
            trajectory_msg.poses.push_back(p);
        }
        
        trajectory_pub_.publish(trajectory_msg);
    }
    
    void publishTransform()
    {
        static tf::TransformBroadcaster br;
        tf::Transform transform;
        
        transform.setOrigin(tf::Vector3(current_pose_(0), current_pose_(1), 0.0));
        tf::Quaternion q;
        q.setRPY(0, 0, current_pose_(2));
        transform.setRotation(q);
        
        br.sendTransform(tf::StampedTransform(transform, ros::Time::now(), 
                                              map_frame_, odom_frame_));
    }
    
    void mapPublishTimerCallback(const ros::TimerEvent&)
    {
        publishMap();
    }

private:
    ros::NodeHandle nh_;
    
    // 订阅和发布
    ros::Subscriber laser_sub_;
    ros::Publisher map_pub_;
    ros::Publisher pose_pub_;
    ros::Publisher trajectory_pub_;
    ros::Timer map_timer_;
    
    // SLAM处理器
    slam::SlamProcessor* slam_processor_;
    
    // 参数
    std::string map_frame_;
    std::string odom_frame_;
    std::string base_frame_;
    std::string laser_frame_;
    
    int map_size_x_;
    int map_size_y_;
    float map_resolution_;
    
    float update_distance_threshold_;
    float update_angle_threshold_;
    
    bool publish_map_updates_;
    double map_publish_period_;
    
    // 状态
    bool first_scan_;
    Eigen::Vector3f current_pose_;
    std::vector<Eigen::Vector3f> trajectory_;
};

int main(int argc, char** argv)
{
    ros::init(argc, argv, "lidar_mapping_node");
    
    LidarMappingNode node;
    
    ros::spin();
    
    return 0;
}
