#!/usr/bin/env node
import { query, closePool } from "./connection.js";

async function provisionReviewer() {
  try {
    const email = process.argv[2];

    if (!email) {
      console.error("Usage: npm run provision-reviewer <email>");
      process.exit(1);
    }

    if (!email.includes("@")) {
      console.error("Error: Invalid email address");
      process.exit(1);
    }

    console.log(`Provisioning reviewer account for: ${email}\n`);

    // Check if user already exists
    const [existingUser] = await query<{ id: number; email: string; role: string }>(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (existingUser) {
      if (existingUser.role === 'reviewer') {
        console.log(`✓ User already exists as a reviewer`);
      } else {
        // Update to reviewer role
        await query(
          "UPDATE users SET role = $1, updated_at = NOW() WHERE email = $2",
          ['reviewer', email]
        );
        console.log(`✓ Updated existing user to reviewer role`);
      }
    } else {
      // Create new reviewer
      await query(
        "INSERT INTO users (email, role) VALUES ($1, $2)",
        [email, 'reviewer']
      );
      console.log(`✓ Created new reviewer account`);
    }

    console.log(`\nReviewer account ready. User can now sign in at /login`);
  } catch (error) {
    console.error("Provision reviewer failed:", error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  provisionReviewer();
}

export { provisionReviewer };
