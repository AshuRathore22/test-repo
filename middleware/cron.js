const cron = require('node-cron');
const moment = require('moment');
const organization = require('../models/organization');
const users = require('../models/users');
const mailer = require('../utils/mailer');

function startCronJob() {
    console.log('Starting cron job...');
    cron.schedule('*/20 * * * * *', async () => {
        try {
            const currentDate = moment.utc();
            const endDateThreshold = moment.utc().add(10, 'days'); 
            const allOrganizations = await organization.find({
                end_date: { $gte: currentDate.toDate(), $lte: endDateThreshold.toDate() }
            });
            for (const org of allOrganizations) {
                const userList = await users.find({
                    'permissions.organizationId': org._id
                });
                for (const user of userList) {
                    const message = `Dear ${user.name}, your subscription for organization ${org.name} is ending soon. Please renew your subscription.`;
                    await mailer.sendEmail(user.email, 'Subscription Renewal Reminder', message);
                    console.log(`Reminder email sent to ${user.email}`);
                }
            }
            console.log('Cron job completed:', currentDate);
        } catch (error) {
            console.log('Error in cron job:', error);
        }
    });
}

module.exports = startCronJob;




// const cron = require('node-cron');

// function startCronJob() {
//     console.log('Starting cron job...');
    
//     cron.schedule('*/5 * * * * *', () => {
//         console.log('Hello');
//     });
// }

// module.exports = startCronJob;

