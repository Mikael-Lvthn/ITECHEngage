import { describe, it, expect } from "vitest";

describe("Bulletin Board Logic", () => {
    it("should require Admin role to create a bulletin post", () => {
        const createBulletin = (userRole: string, postDetails: { title: string }) => {
            if (userRole !== "admin") {
                throw new Error("Unauthorized: Admin role required");
            }
            return { id: "post-1", ...postDetails };
        };

        expect(() => createBulletin("student", { title: "Test" })).toThrow("Unauthorized");
        expect(() => createBulletin("officer", { title: "Test" })).toThrow("Unauthorized");
        
        const post = createBulletin("admin", { title: "System Maintenance" });
        expect(post.id).toBe("post-1");
        expect(post.title).toBe("System Maintenance");
    });

    it("should require a title and type for bulletin posts", () => {
        const validatePost = (post: { type?: string; title?: string }) => {
            if (!post.type || !post.title?.trim()) {
                throw new Error("Type and title are required.");
            }
            return true;
        };

        expect(() => validatePost({ type: "announcement", title: "" })).toThrow("Type and title are required.");
        expect(() => validatePost({ title: "Test" })).toThrow("Type and title are required.");
        expect(validatePost({ type: "maintenance", title: "Test Title" })).toBe(true);
    });

    it("should filter out expired bulletin posts", () => {
        const now = new Date();
        const past = new Date(now.getTime() - 100000).toISOString();
        const future = new Date(now.getTime() + 100000).toISOString();

        const posts = [
            { id: "1", title: "Active Post", expires_at: future },
            { id: "2", title: "Expired Post", expires_at: past },
            { id: "3", title: "Permanent Post", expires_at: null },
        ];

        const activePosts = posts.filter(
            p => p.expires_at === null || new Date(p.expires_at) > now
        );

        expect(activePosts).toHaveLength(2);
        expect(activePosts.map(p => p.id)).toEqual(["1", "3"]);
    });

    it("should sort pinned posts before unpinned posts", () => {
        const posts = [
            { id: "1", pinned: false, created_at: "2026-06-01" },
            { id: "2", pinned: true, created_at: "2026-06-02" },
            { id: "3", pinned: false, created_at: "2026-06-03" },
        ];

        const sorted = [...posts].sort((a, b) => {
            if (a.pinned === b.pinned) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return a.pinned ? -1 : 1;
        });

        expect(sorted[0].id).toBe("2"); // Pinned comes first
        expect(sorted[1].id).toBe("3"); // Newer unpinned comes next
        expect(sorted[2].id).toBe("1"); // Older unpinned comes last
    });
});
