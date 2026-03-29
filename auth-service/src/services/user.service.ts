import prisma from "../prisma/client";

class UserService {
  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
}

export default new UserService();
