const templateService = require('../../services/templateService');
const itemService = require('../../services/itemService');
const logger = require('../../utils/logger');

const templateManagerController = {
  /**
   * GET /admin/template-manager and /admin/template-manager/:id
   * Consolidated into Content Editor. Redirects to Content Editor at the Templates node.
   */
  async index(req, res, next) {
    try {
      const requestedId = req.params.id;
      // Allow legacy mode if specifically requested
      if (req.query.legacy === 'true') {
        const allTemplates = await templateService.list();
        let selectedTemplate = null;
        if (requestedId) {
          selectedTemplate = await templateService.getById(requestedId);
        }
        if (!selectedTemplate && allTemplates.length > 0) {
          selectedTemplate = allTemplates.find((t) => !t.isSystem) || allTemplates[0];
        }

        let resolvedTemplate = null;
        let usage = null;
        if (selectedTemplate) {
          resolvedTemplate = await templateService.resolveTemplate(selectedTemplate._id);
          usage = await templateService.getUsage(selectedTemplate._id);
        }

        return res.render('admin/templates/manager', {
          title: selectedTemplate
            ? `${selectedTemplate.displayName || selectedTemplate.name} - Template Manager`
            : 'Template Manager',
          currentPath: '/admin/template-manager',
          templates: allTemplates,
          selectedTemplate,
          resolvedTemplate,
          usage,
          layout: 'layouts/shell',
        });
      }

      if (requestedId) {
        return res.redirect(`/admin/content-editor/${requestedId}`);
      }
      return res.redirect('/admin/content-editor?path=/sitecore/templates');
    } catch (error) {
      logger.error(`Error loading Template Manager: ${error.message}`);
      next(error);
    }
  },

  /**
   * GET /admin/template-manager/:id/builder
   * Partial HTML: Builder tab
   */
  async getBuilderPartial(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.getById(id);
      if (!template) {
        return res.status(404).send('<div class="alert alert-danger m-3">Template not found.</div>');
      }

      const resolved = await templateService.resolveTemplate(id);
      const quickInfo = await itemService.getQuickInfo(id);

      res.render('admin/templates/partials/tab-builder', {
        layout: false,
        template,
        resolved,
        quickInfo,
      });
    } catch (error) {
      res.status(500).send(`<div class="alert alert-danger m-3">${error.message}</div>`);
    }
  },

  /**
   * GET /admin/template-manager/:id/standard-values
   * Partial HTML: Standard Values tab
   */
  async getStandardValuesPartial(req, res) {
    try {
      const { id } = req.params;
      const resolved = await templateService.resolveTemplate(id);
      if (!resolved) {
        return res.status(404).send('<div class="alert alert-danger m-3">Template not found.</div>');
      }

      res.render('admin/templates/partials/tab-standard-values', {
        layout: false,
        resolved,
      });
    } catch (error) {
      res.status(500).send(`<div class="alert alert-danger m-3">${error.message}</div>`);
    }
  },

  /**
   * GET /admin/template-manager/:id/insert-options
   * Partial HTML: Insert Options tab
   */
  async getInsertOptionsPartial(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.getById(id);
      const allTemplates = await templateService.list();

      if (!template) {
        return res.status(404).send('<div class="alert alert-danger m-3">Template not found.</div>');
      }

      res.render('admin/templates/partials/tab-insert-options', {
        layout: false,
        template,
        allTemplates,
      });
    } catch (error) {
      res.status(500).send(`<div class="alert alert-danger m-3">${error.message}</div>`);
    }
  },

  /**
   * GET /admin/template-manager/:id/inheritance
   * Partial HTML: Inheritance tab
   */
  async getInheritancePartial(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.getById(id);
      const resolved = await templateService.resolveTemplate(id);
      const allTemplates = await templateService.list();

      if (!template) {
        return res.status(404).send('<div class="alert alert-danger m-3">Template not found.</div>');
      }

      res.render('admin/templates/partials/tab-inheritance', {
        layout: false,
        template,
        resolved,
        allTemplates,
      });
    } catch (error) {
      res.status(500).send(`<div class="alert alert-danger m-3">${error.message}</div>`);
    }
  },

  /**
   * GET /admin/template-manager/:id/usage
   * Partial HTML: Usage tab
   */
  async getUsagePartial(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.getById(id);
      const usage = await templateService.getUsage(id);

      if (!template) {
        return res.status(404).send('<div class="alert alert-danger m-3">Template not found.</div>');
      }

      res.render('admin/templates/partials/tab-usage', {
        layout: false,
        template,
        usage,
      });
    } catch (error) {
      res.status(500).send(`<div class="alert alert-danger m-3">${error.message}</div>`);
    }
  },

  /**
   * GET /admin/template-manager/:id/preview
   * Partial HTML: Preview live form rendering
   */
  async getPreviewPartial(req, res) {
    try {
      const { id } = req.params;
      const resolved = await templateService.resolveTemplate(id);
      if (!resolved) {
        return res.status(404).send('<div class="alert alert-danger m-3">Template not found.</div>');
      }

      // Mock item using standard values
      const mockItem = {
        _id: 'mock_preview_id',
        name: 'preview-item',
        displayName: 'Preview Item',
        fields: resolved.standardValues || {},
        updatedAt: new Date(),
      };

      res.render('content-editor/item-form', {
        layout: false,
        item: mockItem,
        template: resolved,
        breadcrumbs: [{ displayName: 'Templates' }, { displayName: resolved.displayName || resolved.name }, { displayName: 'Preview' }],
        isPreview: true,
      });
    } catch (error) {
      res.status(500).send(`<div class="alert alert-danger m-3">${error.message}</div>`);
    }
  },

  // ==========================================
  // JSON API Endpoints
  // ==========================================

  async list(req, res) {
    try {
      const templates = await templateService.list();
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getById(req, res) {
    try {
      const { id } = req.params;
      const template = await templateService.getById(id);
      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found.' });
      }
      res.json({ success: true, data: template });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async getResolved(req, res) {
    try {
      const { id } = req.params;
      const resolved = await templateService.resolveTemplate(id);
      res.json({ success: true, data: resolved });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async create(req, res) {
    try {
      const userId = req.session?.user?.id;
      const template = await templateService.create(req.body, userId);
      res.status(201).json({
        success: true,
        message: `Template '${template.displayName || template.name}' created.`,
        data: template,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async update(req, res) {
    try {
      const { id } = req.params;
      const { expectedUpdatedAt, ...data } = req.body;
      const userId = req.session?.user?.id;

      const updated = await templateService.update(id, data, expectedUpdatedAt, userId);
      res.json({
        success: true,
        message: 'Template updated successfully.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async delete(req, res) {
    try {
      const { id } = req.params;
      await templateService.delete(id);
      res.json({ success: true, message: 'Template deleted successfully.' });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async duplicate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session?.user?.id;
      const copy = await templateService.duplicate(id, userId);
      res.status(201).json({
        success: true,
        message: `Duplicated as '${copy.displayName || copy.name}'.`,
        data: copy,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async setBaseTemplates(req, res) {
    try {
      const { id } = req.params;
      const { baseTemplateIds } = req.body;
      const userId = req.session?.user?.id;

      const updated = await templateService.setBaseTemplates(id, baseTemplateIds, userId);
      res.json({
        success: true,
        message: 'Base templates updated successfully.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async setStandardValues(req, res) {
    try {
      const { id } = req.params;
      const { standardValues, expectedUpdatedAt } = req.body;
      const userId = req.session?.user?.id;

      const updated = await templateService.setStandardValues(
        id,
        standardValues,
        expectedUpdatedAt,
        userId
      );
      res.json({
        success: true,
        message: 'Standard values saved.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async setInsertOptions(req, res) {
    try {
      const { id } = req.params;
      const { insertOptions } = req.body;
      const userId = req.session?.user?.id;

      const updated = await templateService.setInsertOptions(id, insertOptions, userId);
      res.json({
        success: true,
        message: 'Insert options updated.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async addSection(req, res) {
    try {
      const { id } = req.params;
      const userId = req.session?.user?.id;
      const updated = await templateService.addSection(id, req.body, userId);
      res.status(201).json({
        success: true,
        message: 'Section added.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async updateSection(req, res) {
    try {
      const { id, sectionId } = req.params;
      const userId = req.session?.user?.id;
      const updated = await templateService.updateSection(id, sectionId, req.body, userId);
      res.json({
        success: true,
        message: 'Section updated.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async deleteSection(req, res) {
    try {
      const { id, sectionId } = req.params;
      const userId = req.session?.user?.id;
      const updated = await templateService.deleteSection(id, sectionId, userId);
      res.json({
        success: true,
        message: 'Section deleted.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async reorderSections(req, res) {
    try {
      const { id } = req.params;
      const { sectionIds } = req.body;
      const userId = req.session?.user?.id;
      const updated = await templateService.reorderSections(id, sectionIds, userId);
      res.json({ success: true, message: 'Sections reordered.', data: updated });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async addField(req, res) {
    try {
      const { id, sectionId } = req.params;
      const userId = req.session?.user?.id;
      const updated = await templateService.addField(id, sectionId, req.body, userId);
      res.status(201).json({
        success: true,
        message: 'Field added.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async updateField(req, res) {
    try {
      const { id, sectionId, fieldId } = req.params;
      const userId = req.session?.user?.id;
      const updated = await templateService.updateField(id, sectionId, fieldId, req.body, userId);
      res.json({
        success: true,
        message: 'Field updated.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async deleteField(req, res) {
    try {
      const { id, sectionId, fieldId } = req.params;
      const userId = req.session?.user?.id;
      const updated = await templateService.deleteField(id, sectionId, fieldId, userId);
      res.json({
        success: true,
        message: 'Field deleted.',
        data: updated,
      });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async reorderFields(req, res) {
    try {
      const { id, sectionId } = req.params;
      const { fieldIds } = req.body;
      const userId = req.session?.user?.id;
      const updated = await templateService.reorderFields(id, sectionId, fieldIds, userId);
      res.json({ success: true, message: 'Fields reordered.', data: updated });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async moveField(req, res) {
    try {
      const { id, sourceSectionId, fieldId } = req.params;
      const { targetSectionId } = req.body;
      const userId = req.session?.user?.id;
      const updated = await templateService.moveField(id, sourceSectionId, targetSectionId, fieldId, userId);
      res.json({ success: true, message: 'Field moved.', data: updated });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },

  async getUsage(req, res) {
    try {
      const { id } = req.params;
      const usage = await templateService.getUsage(id);
      res.json({ success: true, data: usage });
    } catch (error) {
      const status = error.statusCode || 400;
      res.status(status).json({ success: false, message: error.message });
    }
  },
};

module.exports = templateManagerController;

