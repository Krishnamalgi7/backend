const Contact = require("../models/Contact");

// Build conversation history for older contacts that only have
const initializeConversation = (contact) => {
  if (!Array.isArray(contact.messages)) {
    contact.messages = [];
  }

  if (contact.messages.length > 0) {
    return;
  }

  if (contact.message?.trim()) {
    contact.messages.push({
      sender: "customer",
      text: contact.message.trim(),
      createdAt: contact.createdAt || new Date(),
    });
  }

  if (contact.reply?.trim()) {
    contact.messages.push({
      sender: "admin",
      text: contact.reply.trim(),
      createdAt: contact.updatedAt || new Date(),
    });
  }
};

// Create a contact message
const createContact = async (req, res) => {
  try {
    const { name, phone, message } = req.body;

    const contact = await Contact.create({
      name,
      phone,
      message,
      messages: [
        {
          sender: "customer",
          text: message.trim(),
        },
      ],
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
    const { search = "", status = "all", page = "1", limit = "20" } = req.query;

    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number.parseInt(limit, 10) || 20),
    );

    const filter = {};

    if (status !== "all") {
      if (!["pending", "in_progress", "completed"].includes(status)) {
        return res.status(400).json({
          message: "Invalid contact status filter",
        });
      }

      filter.status = status;
    }

    if (typeof search === "string" && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { phone: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [contacts, total] = await Promise.all([
      Contact.aggregate([
        { $match: filter },
        {
          $addFields: {
            statusOrder: {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$status", "pending"] },
                    then: 0,
                  },
                  {
                    case: { $eq: ["$status", "in_progress"] },
                    then: 1,
                  },
                  {
                    case: { $eq: ["$status", "completed"] },
                    then: 2,
                  },
                ],
                default: 3,
              },
            },
          },
        },
        { $sort: { statusOrder: 1, createdAt: -1, _id: -1 } },
        { $skip: (pageNumber - 1) * pageSize },
        { $limit: pageSize },
        { $project: { statusOrder: 0 } },
      ]),
      Contact.countDocuments(filter),
    ]);

    res.status(200).json({
      contacts,
      total,
      page: pageNumber,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Failed to fetch contacts:", error);

    res.status(500).json({
      message: "Failed to fetch contacts",
    });
  }
};


const getAdminQueryNotifications = async (req, res) => {
  try {
    const filter = {
      status: "pending",
      adminNotificationReadAt: null,
    };

    const [notifications, unreadCount] = await Promise.all([
      Contact.find(filter)
        .select("name phone message status createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Contact.countDocuments(filter),
    ]);

    return res.status(200).json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Failed to fetch admin query notifications:", error);

    return res.status(500).json({
      message: "Failed to fetch admin query notifications",
    });
  }
};


// Get one contact message by ID
const getContactById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        message: "Invalid contact ID",
      });
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return res.status(404).json({
        message: "Contact message not found",
      });
    }

    initializeConversation(contact);

    return res.status(200).json({ contact });
  } catch (error) {
    console.error("Failed to fetch contact details:", error);

    return res.status(500).json({
      message: "Failed to fetch contact details",
    });
  }
};

// Mark a contact message as completed
const updateContactStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const { status } = req.body;

    if (!["pending", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({
        message: "Invalid contact status",
      });
    }

    const contact = await Contact.findByIdAndUpdate(
      id,
      { status },
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

    // Preserve the original message and any legacy reply.
    initializeConversation(contact);

    // Append the new admin reply instead of overwriting history.
    const newMessage = {
      sender: "admin",
      text: reply.trim(),
      createdAt: new Date(),
    };

    contact.messages.push(newMessage);

    // Keep the latest reply field for existing frontend compatibility.
    contact.reply = reply.trim();

    // Track the latest admin reply for mobile notifications.
    contact.lastAdminReplyAt = newMessage.createdAt;
    contact.lastAdminReplyReadAt = null;

    await contact.save();

    // Notify connected clients without changing existing socket events.
    const io = req.app.get("io");

    if (io) {
      io.emit("contact-conversation-updated", {
        contactId: contact._id,
        message: newMessage,
        contact,
      });
    }

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

// 
const markAdminQueryNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({
        message: "Invalid contact ID",
      });
    }

    const contact = await Contact.findOneAndUpdate(
      {
        _id: id,
        adminNotificationReadAt: null,
      },
      {
        $set: { adminNotificationReadAt: new Date() },
      },
      { new: true },
    );

    if (!contact) {
      const existingContact = await Contact.findById(id);

      if (!existingContact) {
        return res.status(404).json({
          message: "Contact message not found",
        });
      }

      return res.status(200).json({
        message: "Query notification was already read",
        contact: existingContact,
      });
    }

    const io = req.app.get("io");

    if (io) {
      io.emit("admin-query-notification-read", {
        contactId: contact._id,
      });
    }

    return res.status(200).json({
      message: "Query notification marked as read",
      contact,
    });
  } catch (error) {
    console.error("Failed to mark admin query notification as read:", error);

    return res.status(500).json({
      message: "Failed to mark query notification as read",
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
      messages: [
        {
          sender: "customer",
          text: message.trim(),
        },
      ],
    });

    req.app.get("io").emit("new-contact-message", contact);

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
      .select("name phone message reply messages status createdAt updatedAt lastAdminReplyAt lastAdminReplyReadAt")
      .sort({ createdAt: -1 });

    contacts.forEach(initializeConversation);

    return res.status(200).json(contacts);
  } catch (error) {
    console.error("Failed to fetch customer contact messages:", error);

    return res.status(500).json({
      message: "Failed to fetch contact messages",
    });
  }
};

// Get unread admin-reply notification count for mobile customer
const getMyUnreadQueryNotificationCount = async (req, res) => {
  try {
    const customerId = req.customer?.customerId;

    if (!customerId) {
      return res.status(401).json({
        message: "Customer authentication required",
      });
    }

    const count = await Contact.countDocuments({
      customerId,
      lastAdminReplyAt: { $ne: null },
      lastAdminReplyReadAt: null,
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error("Failed to fetch unread query notification count:", error);

    return res.status(500).json({
      message: "Failed to fetch unread query notification count",
    });
  }
};


// Mark a customer's admin reply notification as read
const markMyQueryNotificationRead = async (req, res) => {
  try {
    const customerId = req.customer?.customerId;
    const { id } = req.params;

    if (!customerId) {
      return res.status(401).json({
        message: "Customer authentication required",
      });
    }

    const contact = await Contact.findOneAndUpdate(
      {
        _id: id,
        customerId,
        lastAdminReplyAt: { $ne: null },
        lastAdminReplyReadAt: null,
      },
      {
        $set: { lastAdminReplyReadAt: new Date() },
      },
      { new: true },
    );

    if (!contact) {
      return res.status(404).json({
        message: "Unread query notification not found",
      });
    }

    return res.status(200).json({
      message: "Query notification marked as read",
      contact,
    });
  } catch (error) {
    console.error("Failed to mark query notification as read:", error);

    return res.status(500).json({
      message: "Failed to mark query notification as read",
    });
  }
};

module.exports = {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  replyToContact,
  createMobileContact,
  getMyMobileContacts,
  getMyUnreadQueryNotificationCount,
  markMyQueryNotificationRead,
  markAdminQueryNotificationRead,
  getAdminQueryNotifications,
};
