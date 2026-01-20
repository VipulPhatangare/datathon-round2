import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from './models/User.js';
import Config from './models/Config.js';

dotenv.config();

/**
 * Seed database with initial admin user and default configuration
 */
async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Clear all existing data
    console.log('Clearing database...');
    await User.deleteMany({});
    await Config.deleteMany({});
    console.log('Database cleared successfully');

    // Create default admin user
    const adminEmail = 'vipulphatangare3@gmail.com';
    const adminPassword = '123456'; // Change this!
    
    // Check if admin already exists
    const existingAdmin = await User.findOne({ leaderEmail: adminEmail });
    
    if (existingAdmin) {
      console.log('Admin user already exists');
    } else {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(adminPassword, saltRounds);
      
      const admin = new User({
        email: adminEmail,
        leaderEmail: adminEmail,
        passwordHash,
        teamName: 'Admin Team',
        leaderName: 'Admin',
        memberName: null,
        role: 'admin',
        uploadLimit: null
      });
      
      await admin.save();
      console.log('Admin user created successfully');
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('⚠️  IMPORTANT: Change the admin password after first login!');
    }

    // Create default configuration
    const defaultUploadLimit = await Config.findOne({ key: 'defaultUploadLimit' });
    
    if (!defaultUploadLimit) {
      const config = new Config({
        key: 'defaultUploadLimit',
        value: 15
      });
      await config.save();
      console.log('Default upload limit set to 15');
    } else {
      console.log(`Default upload limit already configured: ${defaultUploadLimit.value}`);
    }

    // Create a sample test user (optional)
    const testUserEmail = 'user@test.com';
    const existingTestUser = await User.findOne({ leaderEmail: testUserEmail });
    
    if (!existingTestUser) {
      const testPassword = 'test123';
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(testPassword, saltRounds);
      
      const testUser = new User({
        email: testUserEmail,
        leaderEmail: testUserEmail,
        passwordHash,
        teamName: 'Test Team',
        leaderName: 'Test Leader',
        memberName: 'Test Member',
        memberEmail: 'member@test.com',
        role: 'user',
        uploadLimit: null
      });
      
      await testUser.save();
      console.log('Test user created successfully');
      console.log(`Email: ${testUserEmail}`);
      console.log(`Password: ${testPassword}`);
    } else {
      console.log('Test user already exists');
    }

    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

// Run seed
seed();
