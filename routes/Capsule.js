import express from "express";

const router = express.Router();

const capsules = [
  {
    id: 1,
    name: "Capsule 1",
    description: "This is the first capsule.",
    members: ["Alice", "Bob"],
    openDate: "2030-01-01",
  },
  {
    id: 2,
    name: "Capsule 2",
    description: "This is the second capsule.",
    members: ["Charlie", "David"],
    openDate: "2035-06-15",
  },
];

router.get("/capsules", (req, res) => {
  console.log("GET /api/capsules called");
  let query = req.query.q;

  if (query) {
    query = query.toLowerCase();
    return res.json(
      capsules.filter((capsule) => capsule.name.toLowerCase().includes(query))
    );
  } else res.json(capsules);
});

router.post("/capsules", (req, res) => {
  console.log("POST /api/capsules called");
  const { name, description, openDate } = req.body;

  if (!name || !description || !openDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newCapsule = {
    id: capsules.length + 1,
    name,
    description,
    openDate,
  };

  capsules.push(newCapsule);
  res.status(201).json(newCapsule);
});

export default router;
