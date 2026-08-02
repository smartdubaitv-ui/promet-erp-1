import { Router } from 'express';
import {
  getAssets,
  getAssetCategories,
  getAssetsSummary,
  getCurrentAssetsSummary,
  createAsset,
  updateAsset,
  deleteAsset,
  calculateDepreciation,
  disposeAsset
} from '../controllers/assets.controller';

const router = Router();

router.get('/', getAssets);
router.post('/', createAsset);
router.put('/:id', updateAsset);
router.delete('/:id', deleteAsset);
router.get('/categories', getAssetCategories);
router.get('/asset-categories', getAssetCategories); // دعم المسار المباشر
router.get('/reports/summary', getAssetsSummary);
router.get('/current-assets', getCurrentAssetsSummary);
router.post('/calculate-depreciation', calculateDepreciation);
router.put('/:id/dispose', disposeAsset);

export default router;

