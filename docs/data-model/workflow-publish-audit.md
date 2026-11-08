# Mô hình Quy trình Phê duyệt, Xuất bản & Kiểm toán (Workflow, Publish & Audit)
> File: `docs/data-model/workflow-publish-audit.md`  
> Mô tả: Cấu trúc Collection `workflows`, `publish_histories` và `audit_logs`.

---

## 1. Collection `workflows`

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123800"),
  name: "Standard Publishing Workflow",
  initialStateId: ObjectId("64a1b2c3d4e5f67890123880"),
  states: [
    {
      _id: ObjectId("64a1b2c3d4e5f67890123880"),
      name: "Draft",
      sortOrder: 1,
      isFinal: false,
      actions: [
        {
          name: "Submit for Review",
          nextStateId: ObjectId("64a1b2c3d4e5f67890123881"),
          allowedRoleIds: [ObjectId("...")]
        }
      ]
    },
    {
      _id: ObjectId("64a1b2c3d4e5f67890123881"),
      name: "Awaiting Approval",
      sortOrder: 2,
      isFinal: false,
      actions: [
        {
          name: "Approve",
          nextStateId: ObjectId("64a1b2c3d4e5f67890123882"),
          allowedRoleIds: [ObjectId("...")]
        },
        {
          name: "Reject",
          nextStateId: ObjectId("64a1b2c3d4e5f67890123880"),
          allowedRoleIds: [ObjectId("...")]
        }
      ]
    },
    {
      _id: ObjectId("64a1b2c3d4e5f67890123882"),
      name: "Approved",
      sortOrder: 3,
      isFinal: true                    // Chỉ khi đạt trạng thái isFinal mới được Publish sang items_web
    }
  ]
}
```

---

## 2. Collection `publish_histories`

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123890"),
  publishType: "SmartPublish",         // "IncrementalPublish" | "SmartPublish" | "RepublishAll"
  sourceDatabase: "master",
  targetDatabase: "web",
  rootItemId: ObjectId("64a1b2c3d4e5f67890123400"), // Node gốc thực hiện publish
  totalItemsProcessed: 45,
  totalItemsPublished: 12,
  languages: ["en", "vi-VN"],
  status: "Success",                   // "InProgress" | "Success" | "Failed"
  publishedBy: ObjectId("64a1b2c3d4e5f67890123501"),
  startedAt: ISODate("2026-11-03T10:00:00.000Z"),
  finishedAt: ISODate("2026-11-03T10:00:05.000Z"),
  logDetails: [
    { itemId: ObjectId("..."), action: "PUBLISHED", path: "/root/content/home" }
  ]
}
```

---

## 3. Collection `audit_logs`

```javascript
{
  _id: ObjectId("64a1b2c3d4e5f67890123899"),
  userId: ObjectId("64a1b2c3d4e5f67890123501"),
  username: "editor1",
  action: "ITEM_PRESENTATION_UPDATE",  // LOGIN, LOGOUT, ITEM_CREATE, ITEM_UPDATE, ITEM_DELETE, ITEM_RESTORE, PUBLISH, WORKFLOW_CHANGE, ITEM_PRESENTATION_UPDATE
  targetItemId: ObjectId("64a1b2c3d4e5f67890123400"),
  itemPath: "/root/content/home",
  details: {
    changedFields: ["fields.pageTitle"],
    oldValues: { "pageTitle": "Old Title" },
    newValues: { "pageTitle": "New Title" },
    presentationChanges: {
      action: "REORDER_RENDERINGS",
      placeholder: "main",
      affectedUids: ["b8a5d448-6a3f-4e09-9154-1b12b5f63d33"]
    }
  },
  ipAddress: "192.168.1.10",
  timestamp: ISODate("2026-11-03T10:15:00.000Z")
}
```

*Chỉ mục (Indexes):*
`{ timestamp: -1 }`, `{ targetItemId: 1 }`, `{ userId: 1 }`, `{ action: 1 }`

