import { Router } from 'express';
import { context7Service } from './services/context7Service';

const router = Router();

// Test Context7 connectivity and status
router.get('/api/context7/status', async (req, res) => {
  try {
    const status = await context7Service.getServiceStatus();
    res.json({
      success: true,
      ...status,
      message: status.status === 'healthy' ? 'Context7 service is operational' : 'Context7 service is degraded but functional'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    });
  }
});

// Get library documentation
router.get('/api/context7/library/:libraryName', async (req, res) => {
  try {
    const { libraryName } = req.params;
    
    if (!libraryName || libraryName.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Library name is required'
      });
    }

    const documentation = await context7Service.getLibraryDocumentation(libraryName);
    
    if (documentation) {
      res.json({
        success: true,
        data: documentation,
        source: 'Context7 Service',
        cached: false
      });
    } else {
      res.json({
        success: false,
        error: `Documentation not found for library: ${libraryName}`,
        suggestions: [
          'Check the library name spelling',
          'Ensure the library exists on NPM',
          'Try a different version or variant'
        ]
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch documentation',
      libraryName: req.params.libraryName
    });
  }
});

export default router;