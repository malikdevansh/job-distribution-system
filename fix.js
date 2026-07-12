const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'apps/backend-api/src');

function fixFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            fixFiles(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Fix where: { id }
            content = content.replace(/where:\s*{\s*id\s*}/g, "where: { id: id as string }");
            
            // Fix z.record(z.any()) -> z.record(z.string(), z.any())
            content = content.replace(/z\.record\(z\.any\(\)\)/g, "z.record(z.string(), z.any())");

            // Fix JWT_SECRET being possibly undefined
            content = content.replace(/JWT_SECRET(\s*,\s*\(err)/, "JWT_SECRET as string$1");
            content = content.replace(/jwt\.verify\(token,\s*JWT_SECRET\)/, "jwt.verify(token, JWT_SECRET as string)");

            // Fix ZodError errors property
            content = content.replace(/details:\s*error\.errors/, "details: error.issues");

            // Fix errorPayload: null -> errorPayload: Prisma.DbNull
            content = content.replace(/errorPayload:\s*null/, "errorPayload: require('@prisma/client').Prisma.DbNull");

            // Fix health.worker map
            content = content.replace(/\(w => w\.id\)/, "((w: any) => w.id)");
            
            // Fix jobs controller queue update where we don't have queue on updateData
            content = content.replace(/include:\s*{\s*queue:\s*true\s*}/, "include: { queue: true }");
            
            // Wait, jobs controller error about queue: Property 'queue' does not exist on type...
            // It means I need to type the returned job or it's returned by prisma with queue included.
            
            if (originalContent !== content) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

fixFiles(srcDir);
