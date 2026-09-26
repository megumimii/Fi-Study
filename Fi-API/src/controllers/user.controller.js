const userService = require('../services/user.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class UserController {
  getProfile = asyncHandler(async (req, res) => {
    const profile = await userService.getProfile(req.user.uid, req.user);
    return ApiResponse.success(res, profile, 'User profile retrieved successfully');
  });

  updateProfile = asyncHandler(async (req, res) => {
    const profile = await userService.updateProfile(req.user.uid, req.body);
    return ApiResponse.success(res, profile, 'User profile updated successfully');
  });
}

module.exports = new UserController();
