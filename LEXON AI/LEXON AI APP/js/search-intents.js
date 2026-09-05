/* =========================================================================
   LEXON AI — Smart Search Intent Engine
   =========================================================================
   Goal: when someone types a GOAL ("I want to make automation", "AI se
   thumbnail banana hai", "I want to build a chatbot") instead of an exact
   keyword, this maps that sentence to the right topic(s), so the search
   results page can show a full "learning ecosystem" for that topic —
   Courses + Prompts + Videos + Tools + Guides — instead of a single hit.

   How it works:
     1. Every topic below has a `keywords` list — natural sentences and
        fragments (English + Hinglish) that a real person might type.
     2. matchIntents(query) lowercases the query and scores every topic
        by how many of its keyword phrases appear inside the query
        (substring match, so partial sentences still hit).
     3. The topic(s) with the highest score are returned, best first.
     4. Each topic carries a `categoryTag` — the value stored in each
        content table's `category` column in Supabase — so the results
        page can filter courses/tools/prompts/videos/guides by it.
   ========================================================================= */

(function () {
  "use strict";

  var TOPICS = {

    "ai-automation": {
      label: "AI Automation",
      categoryTag: "AI Automation",
      icon: "workflow",
      keywords: [
        "automation",
        "automate",
        "ai automation",
        "workflow automation",
        "business automation",
        "process automation",
        "marketing automation",
        "sales automation",
        "email automation",
        "automate emails",
        "automate my emails",
        "automate my business",
        "automate my workflow",
        "automate tasks",
        "automate my tasks",
        "automate repetitive tasks",
        "automate repetitive work",
        "automate work",
        "automate my work",
        "automate instagram",
        "instagram automation",
        "automate social media",
        "social media automation",
        "auto post",
        "auto posting",
        "schedule posts automatically",
        "auto reply",
        "automatic reply",
        "automate replies",
        "automate dm",
        "automate dms",
        "chatbot automation",
        "automate content",
        "automate content posting",
        "no-code automation",
        "no code automation",
        "build a workflow",
        "build an automated workflow",
        "create a workflow",
        "make a workflow",
        "automation tool",
        "automation tools",
        "best automation tools",
        "automation software",
        "zapier",
        "make.com",
        "n8n",
        "automate zapier",
        "automate my store",
        "automate ecommerce",
        "ecommerce automation",
        "automate customer support",
        "automate whatsapp",
        "whatsapp automation",
        "automate lead generation",
        "lead generation automation",
        "i want to automate",
        "i want automation",
        "i want to build automation",
        "i want to create automation",
        "i need automation",
        "how to automate",
        "how do i automate",
        "how can i automate",
        "learn automation",
        "learn ai automation",
        "mujhe automation banana hai",
        "automation banana hai",
        "automation kaise banaye",
        "automation kaise bnaye",
        "automation kaise kare",
        "kaam automate karna hai",
        "business automate karna hai",
        "auto karna hai",
        "workflow banana hai",
        "automation seekhna hai",
        "automation sikhna hai"
      ]
    },

    "ai-image": {
      label: "AI Image",
      categoryTag: "AI Image",
      icon: "image",
      keywords: [
        "thumbnail",
        "thumbnails",
        "ai thumbnail",
        "ai thumbnails",
        "youtube thumbnail",
        "youtube thumbnails",
        "make a thumbnail",
        "make thumbnails",
        "create a thumbnail",
        "create thumbnails",
        "design a thumbnail",
        "design thumbnails",
        "how to make a thumbnail",
        "how to create a thumbnail",
        "thumbnail design",
        "thumbnail maker",
        "ai image",
        "ai images",
        "ai art",
        "ai artwork",
        "ai photo",
        "ai photos",
        "ai picture",
        "ai pictures",
        "text to image",
        "image generation",
        "image generator",
        "generate an image",
        "generate images",
        "create an image",
        "create images with ai",
        "make an image with ai",
        "photo editing ai",
        "ai photo editing",
        "ai photo editor",
        "edit photos with ai",
        "remove background ai",
        "background removal ai",
        "ai background remover",
        "midjourney",
        "dalle",
        "dall-e",
        "stable diffusion",
        "leonardo ai",
        "ai poster",
        "ai poster design",
        "poster banana hai",
        "ai logo",
        "logo banana hai ai se",
        "ai wallpaper",
        "ai avatar",
        "avatar banana hai",
        "profile picture ai",
        "thumbnail banana hai",
        "thumbnail kaise banaye",
        "thumbnail kaise bnaye",
        "image banani hai",
        "photo banani hai ai se",
        "picture banani hai",
        "ai se image banana hai",
        "ai se photo banana hai",
        "ai se thumbnail banana hai",
        "design banana hai ai se",
        "graphic design ai"
      ]
    },

    "ai-video": {
      label: "AI Video",
      categoryTag: "AI Video",
      icon: "video",
      keywords: [
        "ai video",
        "ai videos",
        "make a video",
        "make videos",
        "create a video",
        "create videos",
        "create a video with ai",
        "make a video with ai",
        "video editing ai",
        "ai video editor",
        "ai video editing",
        "edit videos with ai",
        "text to video",
        "ai video generator",
        "ai video generation",
        "generate a video",
        "generate videos",
        "faceless video",
        "faceless youtube channel",
        "faceless videos",
        "ai voiceover",
        "voiceover ai",
        "ai voice generator",
        "ai avatar video",
        "talking avatar",
        "shorts banana hai",
        "reels banana hai",
        "youtube shorts ai",
        "instagram reels ai",
        "ai shorts",
        "ai reels",
        "video banana hai",
        "video kaise banaye",
        "video kaise banaye ai se",
        "ai se video banana hai",
        "video editing kaise kare",
        "movie maker ai",
        "animation ai",
        "ai animation",
        "lip sync ai",
        "runway",
        "pika labs",
        "sora",
        "capcut ai",
        "video script ai",
        "script likhna hai video ke liye",
        "youtube video kaise banaye"
      ]
    },

    "prompt-engineering": {
      label: "Prompt Engineering",
      categoryTag: "Prompt Engineering",
      icon: "sparkles",
      keywords: [
        "prompt",
        "prompts",
        "chatgpt prompt",
        "chatgpt prompts",
        "prompt engineering",
        "prompt engineer",
        "best prompts",
        "good prompts",
        "prompt library",
        "prompt pack",
        "prompt collection",
        "midjourney prompts",
        "image prompts",
        "video prompts",
        "writing prompts",
        "business prompts",
        "marketing prompts",
        "sales prompts",
        "productivity prompts",
        "coding prompts",
        "automation prompts",
        "agent prompts",
        "content prompts",
        "instagram prompts",
        "email prompts",
        "resume prompt",
        "cover letter prompt",
        "how to write a good prompt",
        "how to prompt chatgpt",
        "how to write prompts",
        "learn prompt engineering",
        "prompt chahiye",
        "prompt chahiye mujhe",
        "prompt banani hai",
        "acha prompt kaise likhe",
        "prompt kaise likhe",
        "prompt kaise banaye",
        "prompt engineering seekhna hai",
        "prompt engineering sikhna hai",
        "i need a prompt",
        "i need prompts",
        "give me a prompt",
        "give me prompts",
        "share prompts",
        "copy paste prompts"
      ]
    },

    "ai-coding": {
      label: "AI Coding",
      categoryTag: "AI Coding",
      icon: "code",
      keywords: [
        "ai coding",
        "code with ai",
        "coding with ai",
        "ai for coding",
        "ai for developers",
        "ai programming",
        "ai programmer",
        "coding assistant",
        "ai coding assistant",
        "github copilot",
        "copilot",
        "cursor ai",
        "cursor",
        "claude code",
        "chatgpt for coding",
        "build an app with ai",
        "build a website with ai",
        "build software with ai",
        "vibe coding",
        "no code app builder",
        "ai app builder",
        "ai website builder",
        "debug code with ai",
        "fix my code with ai",
        "ai code review",
        "learn to code with ai",
        "code likhna hai ai se",
        "app banana hai ai se",
        "website banana hai ai se",
        "coding seekhni hai",
        "coding sikhni hai",
        "programming seekhni hai",
        "ai se coding kaise kare",
        "ai se app kaise banaye"
      ]
    },

    "ai-agents": {
      label: "AI Agents",
      categoryTag: "AI Agents",
      icon: "bot",
      keywords: [
        "ai agent",
        "ai agents",
        "build an agent",
        "build ai agents",
        "create an ai agent",
        "create ai agents",
        "autonomous agent",
        "autonomous agents",
        "multi-agent",
        "multi agent system",
        "agentic workflow",
        "agentic ai",
        "ai assistant",
        "build an ai assistant",
        "personal ai assistant",
        "customer service agent",
        "support agent ai",
        "ai agent for business",
        "sales agent ai",
        "voice agent",
        "ai voice assistant",
        "langchain",
        "autogen",
        "crewai",
        "agent framework",
        "agent banana hai",
        "ai agent banana hai",
        "agent kaise banaye",
        "assistant banana hai ai se",
        "chatbot banana hai",
        "build a chatbot",
        "create a chatbot",
        "make a chatbot",
        "how to build an ai agent",
        "how to create an ai agent"
      ]
    },

    "productivity": {
      label: "Productivity",
      categoryTag: "Productivity",
      icon: "zap",
      keywords: [
        "productivity",
        "productivity tools",
        "productivity apps",
        "ai for productivity",
        "be more productive",
        "time management",
        "time management ai",
        "task management ai",
        "organize my work",
        "organize my day",
        "ai planner",
        "ai calendar",
        "ai to-do list",
        "ai note taking",
        "note taking ai",
        "ai for students",
        "study with ai",
        "ai for work",
        "work faster with ai",
        "save time with ai",
        "ai for meetings",
        "meeting notes ai",
        "summarize with ai",
        "summarize documents ai",
        "email writing ai",
        "write emails faster",
        "kaam jaldi karna hai",
        "time bachana hai",
        "productivity badhani hai",
        "kaam organize karna hai"
      ]
    },

    "ai-basics": {
      label: "AI Basics",
      categoryTag: "AI Basics",
      icon: "graduation-cap",
      keywords: [
        "what is ai",
        "what is artificial intelligence",
        "learn ai",
        "learn artificial intelligence",
        "ai for beginners",
        "ai basics",
        "ai fundamentals",
        "ai course",
        "ai courses",
        "introduction to ai",
        "beginner ai course",
        "how does ai work",
        "how ai works",
        "understanding ai",
        "ai explained",
        "machine learning basics",
        "deep learning basics",
        "llm basics",
        "how to use chatgpt",
        "how to use ai",
        "getting started with ai",
        "ai seekhna hai",
        "ai sikhna hai",
        "ai seekhni hai shuru se",
        "ai ke baare mein jaanna hai",
        "ai kya hai",
        "ai kaise seekhe",
        "ai kaise sikhe"
      ]
    },

    "content-creation": {
      label: "Content Creation",
      categoryTag: null, // spans multiple categories — see relatedTopics
      icon: "pen-tool",
      relatedTopics: ["ai-video", "ai-image", "prompt-engineering"],
      keywords: [
        "content creation",
        "content creator",
        "content creators",
        "create content with ai",
        "creating content with ai",
        "ai for content creators",
        "ai content creation",
        "content banana hai",
        "content banana hai ai se",
        "youtube content ai",
        "social media content ai",
        "instagram content ai",
        "content ke liye ai",
        "content strategy ai",
        "grow my channel with ai",
        "grow youtube channel ai",
        "personal branding ai",
        "influencer tools ai",
        "content ideas ai",
        "video content ai",
        "blog writing ai",
        "write a blog with ai",
        "caption writing ai",
        "instagram captions ai",
        "hashtag generator ai"
      ]
    }

  };

  /* -----------------------------------------------------------------------
     Matching
     ----------------------------------------------------------------------- */

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function matchIntents(query) {
    var normalizedQuery = normalize(query);

    if (!normalizedQuery) return [];

    var scores = [];

    Object.keys(TOPICS).forEach(function (topicId) {
      var topic = TOPICS[topicId];
      var score = 0;
      var matchedPhrases = [];

      topic.keywords.forEach(function (phrase) {
        var normalizedPhrase = normalize(phrase);

        if (!normalizedPhrase) return;

        if (normalizedQuery.indexOf(normalizedPhrase) !== -1) {
          // Longer phrase matches are stronger signals than short ones.
          score += normalizedPhrase.split(" ").length;
          matchedPhrases.push(phrase);
        }
      });

      if (score > 0) {
        scores.push({
          id: topicId,
          label: topic.label,
          categoryTag: topic.categoryTag,
          icon: topic.icon,
          relatedTopics: topic.relatedTopics || null,
          score: score,
          matchedPhrases: matchedPhrases
        });
      }
    });

    scores.sort(function (a, b) {
      return b.score - a.score;
    });

    return scores;
  }

  function getTopic(topicId) {
    return TOPICS[topicId] || null;
  }

  function allTopics() {
    return Object.keys(TOPICS).map(function (id) {
      return Object.assign({ id: id }, TOPICS[id]);
    });
  }

  window.LexonSearchIntents = {
    matchIntents: matchIntents,
    getTopic: getTopic,
    allTopics: allTopics,
    TOPICS: TOPICS
  };
})();
