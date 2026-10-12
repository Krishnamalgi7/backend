const Contact = require("../models/Contact");

// Create a contact message
const createContact = async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    const contact = await Contact.create({
      name,
      phone,
      message,
    });

    res.status(201).json({
      message: "Message submitted successfully",
      contact,
    });
  } catch (error) {
    console.error("Failed to submit contact:", error);

    res.status(500).json({
      message: "Failed to submit contact",
    });
  }
};

// Get all contact messages
const getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({
      createdAt: -1,
    });

    res.status(200).json(contacts);
  } catch (error) {
    console.error("Failed to fetch contacts:", error);

    res.status(500).json({
      message: "Failed to fetch contacts",
    });
  }
};

// Mark a contact message as completed
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status: "completed" },
      { new: true },
    );

    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
      });
    }

    res.status(200).json({
      message: "Contact marked as completed",
      contact,
    });
  } catch (error) {
    console.error("Failed to update contact status:", error);

    res.status(500).json({
      message: "Failed to update contact status",
    });
  }
};

module.exports = {
  createContact,
  getContacts,
  updateContactStatus 
};