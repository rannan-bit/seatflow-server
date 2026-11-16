// One-off cleanup for the legacy `phone_1` unique index on the users collection.
//
// The current users schema has no `phone` field, but older databases still carry
// a unique index on it. Because every new user stores `phone: null`, the second
// and later staff registrations fail with:
//   E11000 duplicate key error collection: seatflowDB.users index: phone_1 dup key: { phone: null }
//
// Run once from the backend folder:
//   node scripts/dropLegacyPhoneIndex.js
//
// The script is safe to run repeatedly: it only drops the index when it exists.

require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
    await mongoose.connect(process.env.DBConnectionString);

    const collection = mongoose.connection.db.collection('users');
    const indexes = await collection.indexes();
    const legacyIndex = indexes.find((index) => index.name === 'phone_1');

    if (!legacyIndex) {
        console.log('No legacy phone_1 index found, nothing to do.');
        return;
    }

    await collection.dropIndex('phone_1');
    console.log('Dropped legacy unique index phone_1 from the users collection.');
}

main()
    .catch((error) => {
        console.error('Failed to drop the legacy index:', error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
