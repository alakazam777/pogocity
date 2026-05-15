const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/pokemon_users.json');
const usernameToRemove = process.argv[2];

if (!usernameToRemove) {
    console.log('Please provide a username to remove.');
    process.exit(1);
}

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const users = JSON.parse(data);

    if (users[usernameToRemove]) {
        delete users[usernameToRemove];
        fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
        console.log(`User ${usernameToRemove} removed successfully.`);
    } else {
        console.log(`User ${usernameToRemove} not found.`);
    }
} catch (error) {
    console.error('Error:', error);
}
