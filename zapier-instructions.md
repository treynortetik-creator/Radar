I told you I had this set up in Zapier. Here are the instructions I have for an AI agent that was working on this task. I'll also provide you with the link to the Google Sheets where all of the competitor tracking information has been dropped into:

1\. You will receive triggered data from one of the following RSS feeds:

\- CarePredict: https://rss.app/feeds/25jMlxntadAsHFBa.xml

\- VirtuSense: https://rss.app/feeds/Aa9tcMTND8AQIvoO.xml

\- Sage: https://rss.app/feeds/vu4YcycWJ7T4AIHl.xml

\- Nobi: https://rss.app/feeds/S1kyknW26aHp7taZ.xml

\- Inspiren: https://rss.app/feeds/uktPOzvVu1SLfQhp.xml

\- Amba: https://rss.app/feeds/YRFFaPhbqSRpYUw9.xml

2\. Reference :datasource\[SafelyYou\_Competitive\_Intelligence\_v2.txt Base to inform your analysis. This document contains SafelyYou's products and proof points, competitor profiles (Inspiren, Sage, Nobi, CarePredict, and others), high-threat triggers, and routing criteria. Use this knowledge to correctly identify competitors, assess strategic relevance to SafelyYou, and determine appropriate routing.

3\. When a new item appears in the RSS feed, extract the following information:

\- Name (title of the RSS item)

\- URL (link to the article)

\- Summary (description/content from the RSS item)

\- Date (publication date)

\- Raw Creator (Company Name)

4\. Categorize the content Theme. Use one of these values:

\- Product/Feature

\- Customer Win

\- Partnership/Integration

\- Funding/Corporate

\- Competitive Attack

\- Pricing/Packaging

\- Event/Conference

\- Thought Leadership

5\. Score the Threat Level from 1-3. Reference the Threat Assessment Guide in the knowledge base for specific triggers:

\- 1 \= Low: General thought leadership, industry commentary, brand awareness, hiring announcements, culture posts, international-only focus, SNF-only focus

\- 2 \= Medium: Product/feature announcements, customer wins, partnerships, case studies, funding news, conference presence, awards

\- 3 \= High: Direct competitive claims against SafelyYou or incumbent solutions, pricing changes, head-to-head positioning, claims of "first" or "only" in fall detection or eCall or ambient monitoring, bathroom monitoring capabilities, voice-activated eCall, mobile app announcements, bundled pricing, staffing AI claims, REIT partnerships

8\. Score the Strategic Relevance from 1-3. Reference SafelyYou's product portfolio and differentiators in the knowledge base:

\- 1 \= Low: Peripheral markets only (SNF-only, international-only, hospital focus), unrelated technology (medication management, telehealth, dietary)

\- 2 \= Medium: Adjacent markets (AL/IL general, some feature overlap), wellness monitoring without fall detection, general senior living tech, operations management without safety focus

\- 3 \= High: Core market overlap including memory care, fall detection, eCall, nurse call, ambient monitoring, resident safety, staffing optimization, wellness scoring, bathroom monitoring, wearable-free solutions, clinical support services

9\. Score the Content Type Weight from 1-3:

\- 1 \= Awareness: Thought leadership, opinion pieces, industry trends, company culture, hiring, event attendance without specifics

\- 2 \= Credibility: Customer testimonials, case studies, partnerships, integrations, awards, media coverage, conference speaking

\- 3 \= Market Action: Product launches, feature releases, pricing announcements, funding rounds, acquisitions, direct competitive comparisons, expansion announcements, REIT/capital partner deals

10\. Calculate the Priority Score by averaging Threat Level \+ Strategic Relevance \+ Content Type Weight, then divide by 3\. Round to one decimal place.

11\. Assign the Priority Tier based on the Priority Score:

\- 1.0 to 1.6 \= Low

\- 1.7 to 2.3 \= Medium

\- 2.4 to 2.6 \= High

\- 2.7 to 3.0 \= Critical

12\. Check for Auto-Flag Triggers that override the score to Critical. Reference the High Threat Indicators in the knowledge base. Flag if the content contains any of these:

\- Direct mention of "SafelyYou" by name

\- Claims of "first" or "only" or "best" in fall detection, eCall, ambient monitoring, or memory care AI

\- Bathroom monitoring capabilities

\- Voice-activated eCall features

\- Bundled pricing or simplified pricing language

\- Mobile app for caregivers

\- Staffing AI or ambient care tracking claims

\- Mention of Welltower, Ventas, Sabra, or NHI

\- Phrases like "legacy platform" or "outdated" or "playing catch-up"

\- Customer wins at SafelyYou accounts (Sonida, Leisure Care, Avista, Milestone, Maplewood, MorningStar, New Perspective, Merrill Gardens, Cogir, Bickford)

If any trigger is found, set Priority Tier to Critical and list the matched triggers in the Auto-Flag Triggers column.

13\. Determine the Route To value. Reference the Routing Guide in the knowledge base:

\- Marketing \= Content requires counter-messaging, competitive positioning response, or thought leadership counter-content

\- Product \= Content reveals feature gaps, technology capabilities, mobile app functionality, or integration announcements

\- Sales Enablement \= Content affects objection handling, competitive talking points, pricing/packaging intelligence, or case studies with ROI claims

\- Leadership \= Content represents strategic threat including major funding rounds, REIT relationships, M\&A activity, or direct attacks on SafelyYou by name

\- Monitor Only \= General industry trends, hiring/culture posts, international focus, peripheral markets, no immediate action needed

14\. Write a Key Takeaway summarizing the competitive intelligence value in 1-2 sentences. Focus on what SafelyYou should know or do about this content. Reference SafelyYou's positioning and differentiators from the knowledge base to frame the takeaway.

15\. Add a new row to the Google Sheet, with all extracted and analyzed data in the format: Name, URL, Summary, Date, Competitor, Theme, Threat Level, Strategic Relevance, Content Type Weight, Priority Score, Priority Tier, Route To, Key Takeaway, Auto-Flag Triggers   
NOTE: Always add new rows to row number 2, moving the previous line item down.

Final goal: Automatically monitor competitor activity via RSS feeds, score each item for competitive priority using the SafelyYou Competitive Intelligence Knowledge Base as reference, classify by theme and routing, and populate a Google Sheet with actionable competitive intelligence for the SafelyYou marketing team.

Here is the prompt for the job board tracker:  
1\. You will receive triggered data from one of the following RSS feeds:

\- CarePredict: https://rss.app/feeds/25jMlxntadAsHFBa.xml

\- VirtuSense: https://rss.app/feeds/Aa9tcMTND8AQIvoO.xml

\- Sage: https://rss.app/feeds/vu4YcycWJ7T4AIHl.xml

\- Nobi: https://rss.app/feeds/S1kyknW26aHp7taZ.xml

\- Inspiren: https://rss.app/feeds/uktPOzvVu1SLfQhp.xml

\- Amba: https://rss.app/feeds/YRFFaPhbqSRpYUw9.xml

2\. Reference :datasource\[SafelyYou\_Competitive\_Intelligence\_v2.txt\]  
Base to inform your analysis. This document contains SafelyYou's products and proof points, competitor profiles (Inspiren, Sage, Nobi, CarePredict, and others), high-threat triggers, and routing criteria. Use this knowledge to correctly identify competitors, assess strategic relevance to SafelyYou, and determine appropriate routing.

3\. When a new item appears in the RSS feed, extract the following information:

\- Name (title of the RSS item)

\- URL (link to the article)

\- Summary (description/content from the RSS item)

\- Date (publication date)

\- Raw Creator (Company Name)

4\. Categorize the content Theme. Use one of these values:

\- Product/Feature

\- Customer Win

\- Partnership/Integration

\- Funding/Corporate

\- Competitive Attack

\- Pricing/Packaging

\- Event/Conference

\- Thought Leadership

5\. Score the Threat Level from 1-3. Reference the Threat Assessment Guide in the knowledge base for specific triggers:

\- 1 \= Low: General thought leadership, industry commentary, brand awareness, hiring announcements, culture posts, international-only focus, SNF-only focus

\- 2 \= Medium: Product/feature announcements, customer wins, partnerships, case studies, funding news, conference presence, awards

\- 3 \= High: Direct competitive claims against SafelyYou or incumbent solutions, pricing changes, head-to-head positioning, claims of "first" or "only" in fall detection or eCall or ambient monitoring, bathroom monitoring capabilities, voice-activated eCall, mobile app announcements, bundled pricing, staffing AI claims, REIT partnerships

8\. Score the Strategic Relevance from 1-3. Reference SafelyYou's product portfolio and differentiators in the knowledge base:

\- 1 \= Low: Peripheral markets only (SNF-only, international-only, hospital focus), unrelated technology (medication management, telehealth, dietary)

\- 2 \= Medium: Adjacent markets (AL/IL general, some feature overlap), wellness monitoring without fall detection, general senior living tech, operations management without safety focus

\- 3 \= High: Core market overlap including memory care, fall detection, eCall, nurse call, ambient monitoring, resident safety, staffing optimization, wellness scoring, bathroom monitoring, wearable-free solutions, clinical support services

9\. Score the Content Type Weight from 1-3:

\- 1 \= Awareness: Thought leadership, opinion pieces, industry trends, company culture, hiring, event attendance without specifics

\- 2 \= Credibility: Customer testimonials, case studies, partnerships, integrations, awards, media coverage, conference speaking

\- 3 \= Market Action: Product launches, feature releases, pricing announcements, funding rounds, acquisitions, direct competitive comparisons, expansion announcements, REIT/capital partner deals

10\. Calculate the Priority Score by averaging Threat Level \+ Strategic Relevance \+ Content Type Weight, then divide by 3\. Round to one decimal place.

11\. Assign the Priority Tier based on the Priority Score:

\- 1.0 to 1.6 \= Low

\- 1.7 to 2.3 \= Medium

\- 2.4 to 2.6 \= High

\- 2.7 to 3.0 \= Critical

12\. Check for Auto-Flag Triggers that override the score to Critical. Reference the High Threat Indicators in the knowledge base. Flag if the content contains any of these:

\- Direct mention of "SafelyYou" by name

\- Claims of "first" or "only" or "best" in fall detection, eCall, ambient monitoring, or memory care AI

\- Bathroom monitoring capabilities

\- Voice-activated eCall features

\- Bundled pricing or simplified pricing language

\- Mobile app for caregivers

\- Staffing AI or ambient care tracking claims

\- Mention of Welltower, Ventas, Sabra, or NHI

\- Phrases like "legacy platform" or "outdated" or "playing catch-up"

\- Customer wins at SafelyYou accounts (Sonida, Leisure Care, Avista, Milestone, Maplewood, MorningStar, New Perspective, Merrill Gardens, Cogir, Bickford)

If any trigger is found, set Priority Tier to Critical and list the matched triggers in the Auto-Flag Triggers column.

13\. Determine the Route To value. Reference the Routing Guide in the knowledge base:

\- Marketing \= Content requires counter-messaging, competitive positioning response, or thought leadership counter-content

\- Product \= Content reveals feature gaps, technology capabilities, mobile app functionality, or integration announcements

\- Sales Enablement \= Content affects objection handling, competitive talking points, pricing/packaging intelligence, or case studies with ROI claims

\- Leadership \= Content represents strategic threat including major funding rounds, REIT relationships, M\&A activity, or direct attacks on SafelyYou by name

\- Monitor Only \= General industry trends, hiring/culture posts, international focus, peripheral markets, no immediate action needed

14\. Write a Key Takeaway summarizing the competitive intelligence value in 1-2 sentences. Focus on what SafelyYou should know or do about this content. Reference SafelyYou's positioning and differentiators from the knowledge base to frame the takeaway.

15\. Add a new row to the Google Sheet, with all extracted and analyzed data in the format: Name, URL, Summary, Date, Competitor, Theme, Threat Level, Strategic Relevance, Content Type Weight, Priority Score, Priority Tier, Route To, Key Takeaway, Auto-Flag Triggers 

NOTE: Always add new rows to row number 2, moving the previous line item down.

Final goal: Automatically monitor competitor activity via RSS feeds, score each item for competitive priority using the SafelyYou Competitive Intelligence Knowledge Base as reference, classify by theme and routing, and populate a Google Sheet with actionable competitive intelligence for the SafelyYou marketing team.

Job Board RSS Feeds:  
Inspiren Job Board \- [**https://rss.app/feeds/wZIhbEv4NgneuI9y.xml**](https://rss.app/feeds/wZIhbEv4NgneuI9y.xml)  
**Sage Job Board \-** [https://rss.app/feeds/DkJuMn7ntAjjwy8d.xml](https://rss.app/feeds/DkJuMn7ntAjjwy8d.xml)  
Nobi Job Board \- https://rss.app/feeds/IAkb78PdWZJU81uw.xml