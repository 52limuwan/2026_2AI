function success(res, data = {}, message = 'ok') {
  return res.json({
    code: 0,
    message,
    data
  });
}

function failure(res, message = 'error', status = 400, extra = {}) {
  return res.status(status).json({
    code: status,
    message,
    ...extra
  });
}

module.exports = {
  success,
  failure
};
