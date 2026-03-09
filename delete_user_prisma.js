const { PrismaClient } = require('@prisma/client');

// Use the DIRECT_URL from .env which contains the 'postgres' user password
// postgresql://postgres:R7l0SSVx0dyA76Yu@db.yvqrixwmdknvttzddjfa.supabase.co:5432/postgres
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: "postgresql://postgres:R7l0SSVx0dyA76Yu@db.yvqrixwmdknvttzddjfa.supabase.co:5432/postgres"
        }
    }
});

async function main() {
    const email = 'peter.z.feng@gmail.com';
    console.log(`Checking for user: ${email} via Prisma...`);

    const user = await prisma.user.findUnique({
        where: { email: email }
    });

    if (!user) {
        console.log("User not found.");
        return;
    }

    console.log(`Found user: ${user.id}`);

    // Delete dependent records
    console.log("Deleting generated_images...");
    const deletedImages = await prisma.generatedImage.deleteMany({
        where: { userId: user.id }
    });
    console.log(`Deleted ${deletedImages.count} images.`);

    console.log("Deleting image_generation_jobs...");
    const deletedJobs = await prisma.image_generation_jobs.deleteMany({
        where: { user_id: user.id }
    });
    console.log(`Deleted ${deletedJobs.count} jobs.`);

    console.log("Deleting custom_prompts...");
    const deletedPrompts = await prisma.customPrompt.deleteMany({
        where: { userId: user.id } // Note: Prisma convention is camelCase for fields in model, need to verify
    });
    console.log(`Deleted ${deletedPrompts.count} prompts.`);

    console.log("Deleting subscription...");
    const deletedSub = await prisma.subscription.deleteMany({
        where: { userId: user.id }
    });
    console.log(`Deleted ${deletedSub.count} subscriptions.`);

    // Delete User
    console.log("Deleting user...");
    const deletedUser = await prisma.user.delete({
        where: { id: user.id }
    });
    console.log(`Successfully deleted user: ${deletedUser.email}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
