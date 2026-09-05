const LexonContent = (() => {
    const resourceTypes = [
        "videos",
        "guides",
        "tools",
        "prompts",
        "courses"
    ];

    const tableMap = {
        videos: "videos",
        guides: "guides",
        tools: "tools",
        prompts: "prompts",
        courses: "courses"
    };

    async function getResources(type, options = {}) {
        const table = tableMap[type];

        if (!table || !window.LexonSupabase?.client()) {
            return [];
        }

        let query = window.LexonSupabase.client()
            .from(table)
            .select("*")
            .eq("status", "published");

        if (options.search) {
            const search = options.search.trim();

            if (search) {
                query = query.or(
                    `title.ilike.%${search}%,description.ilike.%${search}%`
                );
            }
        }

        if (options.category) {
            query = query.eq("category", options.category);
        }

        if (options.limit) {
            query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
            console.error(`Failed to load ${type}:`, error);
            return [];
        }

        return data || [];
    }

    async function searchAll(query, limit = 5) {
        const search = query?.trim();

        if (!search) {
            return {
                videos: [],
                guides: [],
                tools: [],
                prompts: [],
                courses: []
            };
        }

        const results = {};

        for (const type of resourceTypes) {
            results[type] = await getResources(type, {
                search,
                limit
            });
        }

        return results;
    }

    function getResourceUrl(type, id) {
        if (!id) return "#";

        const pages = {
            videos: "videos.html",
            guides: "guides.html",
            tools: "tools.html",
            prompts: "prompts.html",
            courses: "courses.html"
        };

        const page = pages[type];

        if (!page) return "#";

        return `${page}?id=${encodeURIComponent(id)}`;
    }

    return {
        getResources,
        searchAll,
        getResourceUrl
    };
})();

window.LexonContent = LexonContent;