import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import * as dayjs from 'dayjs';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private wallet: WalletService,
  ) {}

  async getVehicles() {
    return this.prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { level: 'asc' },
    });
  }

  async purchaseVehicle(userId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle || !vehicle.isActive)
      throw new NotFoundException('Vehicle not found');

    await this.wallet.deductCoins(
      userId,
      vehicle.coinPrice,
      `Purchase vehicle: ${vehicle.name}`,
      vehicleId,
    );

    const expiresAt = vehicle.duration
      ? dayjs().add(vehicle.duration, 'day').toDate()
      : undefined;

    return this.prisma.userVehicle.upsert({
      where: { userId_vehicleId: { userId, vehicleId } },
      update: { expiresAt, isActive: false },
      create: { userId, vehicleId, expiresAt, isActive: false },
    });
  }

  async getUserVehicles(userId: string) {
    return this.prisma.userVehicle.findMany({
      where: { userId },
      include: { vehicle: true },
    });
  }

  async activateVehicle(userId: string, vehicleId: string) {
    const userVehicle = await this.prisma.userVehicle.findUnique({
      where: { userId_vehicleId: { userId, vehicleId } },
    });
    if (!userVehicle)
      throw new NotFoundException('You do not own this vehicle');
    if (userVehicle.expiresAt && new Date() > userVehicle.expiresAt) {
      throw new BadRequestException('Vehicle has expired');
    }

    await this.prisma.userVehicle.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return this.prisma.userVehicle.update({
      where: { userId_vehicleId: { userId, vehicleId } },
      data: { isActive: true },
      include: { vehicle: true },
    });
  }

  async deactivateVehicle(userId: string) {
    await this.prisma.userVehicle.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return { message: 'Vehicle deactivated' };
  }
}
