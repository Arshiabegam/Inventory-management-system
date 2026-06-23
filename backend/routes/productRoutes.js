const express = require("express");
const router = express.Router();

const {
  addProduct,
  getProducts,
  updateProduct,
  deleteProduct
} = require("../controllers/productcontroller");

// CREATE
router.post("/add", addProduct);

// READ
router.get("/", getProducts);

// UPDATE
router.put("/update/:id", updateProduct);

// DELETE
router.delete("/delete/:id", deleteProduct);

module.exports = router;