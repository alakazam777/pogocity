const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../data/pokemon_users.json');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const users = JSON.parse(data);

    if (users['TestUser']) {
        delete users['TestUser'];
        console.log('Deleted TestUser');
    } else {
        console.log('TestUser not found');
    }

    if (users['Lcsnzh']) {
        delete users['Lcsnzh'];
        console.log('Deleted Lcsnzh');
    } else {
        console.log('Lcsnzh not found');
    }

    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
    console.log('Successfully updated pokemon_users.json');

} catch (error) {
    console.error('Error updating users:', error);
}
