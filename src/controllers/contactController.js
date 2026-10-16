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

// Reply to a customer contact message
const replyToContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (typeof reply !== "string" || !reply.trim()) {
      return res.status(400).json({
        message: "Reply cannot be empty",
      });
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
      });
    }

    const isFirstReply = !contact.reply?.trim();

    contact.reply = reply.trim();

    if (isFirstReply) {
      contact.status = "completed";
    }

    await contact.save();

    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
      });
    }

    return res.status(200).json({
      message: "Reply sent successfully",
      contact,
    });
  } catch (error) {
    console.error("Failed to reply to contact:", error);

    return res.status(500).json({
      message: "Failed to send reply",
    });
  }
};

// Create a contact message from an authenticated mobile customer
const createMobileContact = async (req, res) => {
  try {
    const { name, phone, message } = req.body;
    const customerId = req.customer?.customerId;

    if (!customerId) {
      return res.status(401).json({
        message: "Customer authentication required",
      });
    }

    if (!name?.trim() || !phone?.trim() || !message?.trim()) {
      return res.status(400).json({
        message: "Name, phone and message are required",
      });
    }

    const contact = await Contact.create({
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      customerId,
    });

    return res.status(201).json({
      message: "Message submitted successfully",
      contact,
    });
  } catch (error) {
    console.error("Failed to submit mobile contact:", error);

    return res.status(500).json({
      message: "Failed to submit contact message",
    });
  }
};

// Get contact messages belonging to the logged-in mobile customer
const getMyMobileContacts = async (req, res) => {
  try {
    const customerId = req.customer?.customerId;

    if (!customerId) {
      return res.status(401).json({
        message: "Customer authentication required",
      });
    }

    const contacts = await Contact.find({ customerId })
      .select("name phone message reply status createdAt updatedAt")
      .sort({ createdAt: -1 });

    return res.status(200).json(contacts);
  } catch (error) {
    console.error("Failed to fetch customer contact messages:", error);

    return res.status(500).json({
      message: "Failed to fetch contact messages",
    });
  }
};

module.exports = {
  createContact,
  getContacts,
  updateContactStatus,
  replyToContact,
  createMobileContact,
  getMyMobileContacts,
};
