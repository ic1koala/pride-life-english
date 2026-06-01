import mysql from 'mysql2/promise';

const url = 'mysql://3He9Kr6rE3YXuJN.root:jMbUqDSX0n4213Aq2JYl@gateway06.us-east-1.prod.aws.tidbcloud.com:4000/BVjbDoYv3dVNtWtmbAeKMV?ssl={"rejectUnauthorized":true}';

async function main() {
  console.log("Connecting to TiDB Cloud MySQL database...");
  const connection = await mysql.createConnection(url);

  console.log("Connected successfully! Creating tables if they don't exist...");

  const queries = [
    `CREATE TABLE IF NOT EXISTS \`courseNews\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`title\` varchar(256) NOT NULL,
      \`content\` text NOT NULL,
      \`imageUrl\` varchar(512) DEFAULT NULL,
      \`videoUrl\` varchar(512) DEFAULT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS \`threads\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`title\` varchar(256) NOT NULL,
      \`content\` text NOT NULL,
      \`imageUrl\` varchar(512) DEFAULT NULL,
      \`videoUrl\` varchar(512) DEFAULT NULL,
      \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS \`courseNewsReads\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`userId\` int NOT NULL,
      \`newsId\` int NOT NULL,
      \`readAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`,
    `CREATE TABLE IF NOT EXISTS \`threadReads\` (
      \`id\` int AUTO_INCREMENT PRIMARY KEY,
      \`userId\` int NOT NULL,
      \`threadId\` int NOT NULL,
      \`readAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
    );`
  ];

  for (const query of queries) {
    console.log(`Executing query:\n${query}\n`);
    await connection.query(query);
  }

  console.log("All tables created successfully!");
  await connection.end();
}

main().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
