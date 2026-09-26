const materialService = require('../services/material.service');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

class MaterialController {
  getMaterials = asyncHandler(async (req, res) => {
    const materials = await materialService.getMaterials(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID
    );
    return ApiResponse.success(res, materials, 'Materials retrieved successfully');
  });

  getMaterialById = asyncHandler(async (req, res) => {
    const material = await materialService.getMaterialById(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID,
      req.params.materialUID
    );
    return ApiResponse.success(res, material, 'Material retrieved successfully');
  });

  createMaterial = asyncHandler(async (req, res) => {
    const material = await materialService.createMaterial(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID,
      req.body
    );
    return ApiResponse.created(res, material, 'Material created successfully');
  });

  updateMaterial = asyncHandler(async (req, res) => {
    const material = await materialService.updateMaterial(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID,
      req.params.materialUID,
      req.body
    );
    return ApiResponse.success(res, material, 'Material updated successfully');
  });

  updateProgress = asyncHandler(async (req, res) => {
    const { passed = true } = req.body;
    const material = await materialService.updateProgress(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID,
      req.params.materialUID,
      passed
    );
    return ApiResponse.success(res, material, 'Material progress updated successfully');
  });

  deleteMaterial = asyncHandler(async (req, res) => {
    const result = await materialService.deleteMaterial(
      req.user.uid,
      req.params.courseUID,
      req.params.lessonUID,
      req.params.materialUID
    );
    return ApiResponse.success(res, result, 'Material deleted successfully');
  });
}

module.exports = new MaterialController();
