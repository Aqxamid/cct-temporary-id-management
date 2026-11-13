import bcrypt from "bcrypt";
import { db } from "../src/services/db.js";
import { createAdmin, getAdminByUsername } from "../src/services/dbService.js";

// The only seeded account. No dummy students are created.
const seedAdmin = {
  adminId: "ADM-001",
  fullName: "MIS Administrator",
  username: "admin",
  password: "Password123!",
  role: "MIS_ADMIN",
};

async function seed() {
  // Rename the account if it was seeded earlier with an old username.
  const legacy = ["mis_admin", "MIS Admin"]
    .map((username) => getAdminByUsername(username))
    .find((admin) => admin && !getAdminByUsername(seedAdmin.username));
  if (legacy && !getAdminByUsername(seedAdmin.username)) {
    db.prepare("UPDATE admins SET username = ? WHERE admin_id = ?")
      .run(seedAdmin.username, legacy.adminId);
    console.log(`Renamed admin "${legacy.username}" to "${seedAdmin.username}"`);
  }

  const existing = getAdminByUsername(seedAdmin.username);

  if (existing) {
    // Keep the documented credentials working even if the account was seeded
    // earlier with a different password.
    const passwordHash = await bcrypt.hash(seedAdmin.password, 10);
    db.prepare(
      "UPDATE admins SET password_hash = ?, full_name = ?, role = ? WHERE username = ?",
    ).run(passwordHash, seedAdmin.fullName, seedAdmin.role, seedAdmin.username);
    console.log(`Updated admin: ${seedAdmin.username}`);
  } else {
    createAdmin({
      adminId: seedAdmin.adminId,
      username: seedAdmin.username,
      passwordHash: await bcrypt.hash(seedAdmin.password, 10),
      fullName: seedAdmin.fullName,
      role: seedAdmin.role,
    });
    console.log(`Seeded admin: ${seedAdmin.username}`);
  }

  console.log(`Name: ${seedAdmin.fullName}`);
  console.log(`Username: ${seedAdmin.username}`);
  console.log(`Password: ${seedAdmin.password}`);
}

seed().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
});
