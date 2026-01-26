/**
 * 输入验证中间件
 * 使用 express-validator 进行系统的输入验证
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError } = require('./errorHandler');
const config = require('../config');

// 验证结果处理
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path,
      message: err.msg,
      value: err.value
    }));
    throw new ValidationError('输入验证失败', errorMessages);
  }
  next();
};

// 通用验证规则
const validators = {
  // 用户注册验证
  register: [
    body('identifier')
      .trim()
      .notEmpty().withMessage('账号不能为空')
      .isLength({ min: 3, max: 50 }).withMessage('账号长度应在3-50字符之间'),
    
    body('password')
      .notEmpty().withMessage('密码不能为空')
      .isLength({ min: config.security.passwordMinLength })
      .withMessage(`密码长度至少${config.security.passwordMinLength}字符`)
      .custom((value) => {
        if (config.security.passwordRequireUppercase && !/[A-Z]/.test(value)) {
          throw new Error('密码必须包含大写字母');
        }
        if (config.security.passwordRequireLowercase && !/[a-z]/.test(value)) {
          throw new Error('密码必须包含小写字母');
        }
        if (config.security.passwordRequireNumbers && !/\d/.test(value)) {
          throw new Error('密码必须包含数字');
        }
        if (config.security.passwordRequireSpecialChars && !/[!@#$%^&*]/.test(value)) {
          throw new Error('密码必须包含特殊字符');
        }
        return true;
      }),
    
    body('role')
      .optional()
      .isIn(['client', 'guardian', 'merchant', 'gov'])
      .withMessage('角色不合法'),
    
    body('idCard')
      .optional()
      .matches(/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/)
      .withMessage('身份证号格式不正确'),
    
    handleValidationErrors
  ],

  // 登录验证
  login: [
    body('identifier')
      .trim()
      .notEmpty().withMessage('账号不能为空'),
    
    body('password')
      .notEmpty().withMessage('密码不能为空'),
    
    handleValidationErrors
  ],

  // ID参数验证
  idParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('ID必须是正整数'),
    
    handleValidationErrors
  ],

  // 分页验证
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('页码必须是正整数'),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    
    handleValidationErrors
  ],

  // 订单创建验证
  createOrder: [
    body('items')
      .isArray({ min: 1 }).withMessage('订单项不能为空'),
    
    body('items.*.dishId')
      .isInt({ min: 1 }).withMessage('菜品ID必须是正整数'),
    
    body('items.*.quantity')
      .isInt({ min: 1, max: 100 }).withMessage('数量必须在1-100之间'),
    
    body('merchantId')
      .isInt({ min: 1 }).withMessage('商户ID必须是正整数'),
    
    body('address')
      .trim()
      .notEmpty().withMessage('地址不能为空')
      .isLength({ max: 200 }).withMessage('地址长度不能超过200字符'),
    
    handleValidationErrors
  ],

  // 菜品创建验证
  createDish: [
    body('name')
      .trim()
      .notEmpty().withMessage('菜品名称不能为空')
      .isLength({ max: 100 }).withMessage('菜品名称不能超过100字符'),
    
    body('price')
      .isFloat({ min: 0 }).withMessage('价格必须是非负数'),
    
    body('stock')
      .optional()
      .isInt({ min: 0 }).withMessage('库存必须是非负整数'),
    
    body('category')
      .optional()
      .isIn(['主食', '荤菜', '素菜', '汤品', '小吃', '饮品'])
      .withMessage('分类不合法'),
    
    handleValidationErrors
  ]
};

module.exports = validators;
