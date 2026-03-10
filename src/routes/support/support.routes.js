const express = require("express");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth");
const SupportController = require("./support.controller");

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads", "support");
      require("fs").mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const unique = Date.now() + "-" + (file.originalname || "file").replace(/[^a-zA-Z0-9.-]/g, "_");
      cb(null, unique);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.use(authMiddleware);

router.post("/", SupportController.create);
router.get("/", SupportController.myTickets);
router.get("/:id/attachments", SupportController.getAttachments);
router.post("/:id/attachments", upload.single("file"), SupportController.addAttachment);
router.get("/:id", SupportController.getById);
router.post("/:id/replies", SupportController.addReply);

module.exports = router;
