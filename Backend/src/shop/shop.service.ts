import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateAboutDto } from './dto/create-shop.dto';
import { Prisma } from '@prisma/client';
import { UpdateAboutDto } from './dto/update-shop.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login-shop.dto';
import { emit } from 'process';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AboutusService {
    constructor(private readonly databaseService: DatabaseService,
        private readonly jwtService:JwtService) {
    
    }

    async login(loginData:LoginDto) {
        const email=loginData.email;
        const password=loginData.password
        try {
            const user = await this.databaseService.shop.findUnique({ where: { email } });
  
            if (!user) {
                throw new UnauthorizedException('Invalid email');
            }
  
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                throw new UnauthorizedException('Invalid password');
            }
  
            return {
                token: this.jwtService.sign({email})
            };
        } catch (error) {
            throw new UnauthorizedException('Login failed: ' + error.message);
        }
    }

    async create(createAboutDto: CreateAboutDto) {
        try {
            const email = createAboutDto.email;
            // Check if a shop with the given email already exists
            const existingUser = await this.databaseService.shop.findUnique({ where: { email } });
    
            if (existingUser) {
                throw new UnauthorizedException('Email already in use');
            }
    
            // Hash the password before saving
            const hashedPassword = await bcrypt.hash(createAboutDto.password, 10);
            
            let data: Prisma.ShopCreateInput = {
                name: createAboutDto.name,
                phn_number: createAboutDto.phn_number,
                email: createAboutDto.email,
                password: hashedPassword,
            };
    
            return this.databaseService.shop.create({ data });
        } catch (error) {
            return {
                message: 'Could not create shop entry',
                error: error.message,
            };
        }
    }
    

    async update(id:number, updateAboutDto:UpdateAboutDto){
        try {
            const existingAboutUs = await this.databaseService.shop.findUnique({ where: { id } });
    if (!existingAboutUs) {
      throw new Error(`About Us section with ID ${id} not found`);
    }
    
    return this.databaseService.shop.update({
      where: { id },
      data: {
        ...updateAboutDto,
        // Retain the existing image if no new image is provided
        
    },
    });
        } catch (error) {
            return {
                message: 'Could not Update details'
            }
        }
    }


    async findOne(id:number) {
        const printer = await this.databaseService.shop.findUnique({
            where: { id: Number(id) },
        });

        delete printer.password;
        return printer;
      }

      async getQueue(id: number) {
        const queue = await this.databaseService.printRequest.findMany({
          where: {
            shopId: Number(id),
            done: 'false',
            paid: 'true'
          },
          orderBy: { createdAt: 'asc' },
          include: {
            printFiles: true,  // Include the related PrintFiles
          },
        });
      
        console.log(queue);
      
        return queue;
      }

      async markComplete(id: number, queueId: number) {
        // Update the PrintRequest status to 'completed'
        await this.databaseService.printRequest.update({
          where: { id: Number(queueId) },
          data: { done: 'true' },
        });
      
        // Get the updated queue
        return this.getQueue(id);
      }

      async markPaid(queueId: number) {
        // Update the PrintRequest status to 'paid'
        await this.databaseService.printRequest.update({
          where: { id: Number(queueId) },
          data: { paid: 'true' },
        });
      
        return true;
      }

      async findAll() {
        return this.databaseService.shop.findMany();
      }
}

