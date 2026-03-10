const ClientRepository = require("./client.repository");

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

class ClientService {

  /**
   * Create Client Profile
   */
  static async createClient(data) {

    // Check if profile already exists
    const existing = await ClientRepository.findByUserId(data.user_id);

    if (existing) {
      throw new AppError("Client profile already exists", 400);
    }

    return await ClientRepository.create(data);
  }

  /**
   * Get Client by ID
   */
  static async getClientById(id) {

    const client = await ClientRepository.findById(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    return client;
  }

  /**
   * Get Client by User ID
   */
  static async getClientByUserId(userId) {

    const client = await ClientRepository.findByUserId(userId);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    return client;
  }

  /**
   * Get All Clients (Admin / Super Admin)
   */
  static async getAllClients(pagination) {

    return await ClientRepository.findAll(pagination);
  }

  /**
   * Update Client
   */
  static async updateClient(id, updateData, currentUser) {

    const client = await ClientRepository.findById(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    // RBAC Rule:
    // CLIENT can only update their own profile
    if (
      currentUser.role === "CLIENT" &&
      client.user_id !== currentUser.id
    ) {
      throw new AppError("Unauthorized action", 403);
    }

    return await ClientRepository.update(id, updateData);
  }

  /**
   * Delete Client (Admin only)
   */
  static async deleteClient(id, currentUser) {

    if (currentUser.role !== "ADMIN" &&
        currentUser.role !== "SUPER_ADMIN") {
      throw new AppError("Unauthorized action", 403);
    }

    const client = await ClientRepository.findById(id);

    if (!client) {
      throw new AppError("Client not found", 404);
    }

    return await ClientRepository.delete(id);
  }
}

module.exports = ClientService;