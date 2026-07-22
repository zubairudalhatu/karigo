import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { shouldUsePrismaAccelerate } from "./prisma-accelerate";

type PrismaRuntimeClient = PrismaClient & Record<PropertyKey, unknown>;

function createPrismaClient(): PrismaRuntimeClient {
  const client = new PrismaClient();
  return shouldUsePrismaAccelerate()
    ? client.$extends(withAccelerate()) as unknown as PrismaRuntimeClient
    : client as PrismaRuntimeClient;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaRuntimeClient;

  constructor() {
    this.client = createPrismaClient();

    return new Proxy(this, {
      get(target, property, receiver) {
        if (property in target) {
          return Reflect.get(target, property, receiver);
        }

        const value = target.client[property];
        return typeof value === "function" ? value.bind(target.client) : value;
      }
    }) as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}

export interface PrismaService extends PrismaClient {}
