import "./env";
import { db } from "./client";
import { seed } from "./seedData";

async function main() {
  const result = await seed(db);
  console.log(`Seeded operator ${result.operator.businessName} (${result.operator.id})`);
  console.log(
    "Customers:",
    Object.entries(result.customers)
      .map(([k, c]) => `${k}=${c.id}`)
      .join(", "),
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
