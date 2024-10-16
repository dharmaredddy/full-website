import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

// Get all posts with optional filters
export const getPosts = async (req, res) => {
  const query = req.query;

  try {
    const posts = await prisma.post.findMany({
      where: {
        city: query.city || undefined,
        type: query.type || undefined,
        property: query.property || undefined,
        bedroom: parseInt(query.bedroom) || undefined,
        price: {
          gte: parseInt(query.minPrice) || undefined,
          lte: parseInt(query.maxPrice) || undefined,
        },
      },
    });

    res.status(200).json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get posts" });
  }
};

// Get a single post by ID
export const getPost = async (req, res) => {
  const id = req.params.id;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const token = req.cookies?.token;

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
        if (!err) {
          const saved = await prisma.savedPost.findUnique({
            where: {
              userId_postId: {
                userId: payload.id,
                postId: id,
              },
            },
          });
          return res.status(200).json({ ...post, isSaved: saved ? true : false });
        }
      });
    }
    
    res.status(200).json({ ...post, isSaved: false });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to get post" });
  }
};

export const addPost = async (req, res) => {
  const {
    title,
    price,
    images,
    address,
    city,
    bedroom,
    bathroom,
    latitude,
    longitude,
    type,
    property,
    desc,
    floor,
    parking,
    size,
    school,
    bus,
    contact,
  } = req.body;

  const tokenUserId = req.userId;

  try {
    // Validate required fields
    if (!title || !price || !images || !address || !tokenUserId) {
      return res.status(400).json({ message: "Required fields are missing." });
    }

    // Validate bedroom and bathroom, ensuring they are not null
    if (bedroom === null || bedroom === undefined) {
      return res.status(400).json({ message: "Bedroom count is required." });
    }

    // Check if user exists
    const userExists = await prisma.user.findUnique({
      where: { id: tokenUserId },
    });

    if (!userExists) {
      return res.status(404).json({ message: "User not found." });
    }

    // Create a new post with a connection to the user
    const newPost = await prisma.post.create({
      data: {
        title,
        price,
        images,
        address,
        city,
        bedroom: parseInt(bedroom, 10), // Ensure bedroom is an integer
        bathroom: bathroom ? parseInt(bathroom, 10) : null, // Convert bathroom if provided
        latitude,
        longitude,
        type,
        property,
        desc,
        floor,
        parking,
        size,
        school,
        bus,
        contact,
        user: {
          connect: { id: tokenUserId }, // Connect to the user using userId
        },
      },
    });

    res.status(201).json(newPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  const id = req.params.id;
  const tokenUserId = req.userId;

  try {
    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId !== tokenUserId) {
      return res.status(403).json({ message: "Not Authorized!" });
    }

    await prisma.post.delete({
      where: { id },
    });

    res.status(200).json({ message: "Post deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};
