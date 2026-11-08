const mongoose = require('mongoose');
require('dotenv').config();
const Item = require('../src/models/Item');
const Template = require('../src/models/Template');

async function syncAll() {
  await mongoose.connect(process.env.MONGO_URI);

  const templateItems = await Item.find({
    path: { $regex: '^/root/templates', $options: 'i' },
    deleted: false
  }).lean();

  console.log('Found template items:', templateItems.length);
  for (const item of templateItems) {
    if (item.presentation?.shared?.layoutId || (item.presentation?.shared?.renderings && item.presentation.shared.renderings.length > 0)) {
      console.log('Syncing presentation from Item to Template:', item.name, item._id);
      await Template.findByIdAndUpdate(item._id, {
        presentation: {
          layoutId: item.presentation.shared.layoutId,
          renderings: item.presentation.shared.renderings
        }
      });
    }
  }

  // Also check if any Template has presentation but Item does not
  const templates = await Template.find({
    'presentation.renderings.0': { $exists: true }
  }).lean();
  console.log('Found templates with presentation:', templates.length);
  for (const t of templates) {
    const item = await Item.findById(t._id);
    if (item && (!item.presentation?.shared?.renderings || item.presentation.shared.renderings.length === 0)) {
      console.log('Syncing presentation from Template to Item:', t.name, t._id);
      if (!item.presentation) item.presentation = { shared: {}, final: [] };
      item.presentation.shared = {
        layoutId: t.presentation.layoutId,
        renderings: t.presentation.renderings
      };
      await item.save();
    }
  }

  console.log('Sync complete!');
  await mongoose.disconnect();
}

syncAll().catch(err => {
  console.error(err);
  process.exit(1);
});

