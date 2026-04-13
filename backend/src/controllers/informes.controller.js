// informes controller — implement each method
exports.getAll  = async (req, res) => res.json([])
exports.getById = async (req, res) => res.json({})
exports.create  = async (req, res) => res.status(201).json({})
exports.update  = async (req, res) => res.json({})
exports.remove  = async (req, res) => res.json({ deleted: true })
