app.post("/api/message", async (req, res) => {
  const userMessage = req.body.message;

  // Add user's message to the conversation history
  conversationHistory.push({ role: "user", content: userMessage });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `
          You are SunLife's friendly financial assistant, helping users discuss financial topics and set up savings goals called "Challenges."
          If the user expresses interest in creating a financial goal, guide them to set up a "Challenge." The reward for the challenge should be a number from 50-500, in increments of 25 (you can randomize this for now).
          Here's the structure of a "Challenge":
          {
            "name": string,        // Name of the goal
            "description": string, // Brief description of the goal
            "currentAmount": number, // Current amount saved
            "goalAmount": number,  // Total amount to save
            "reward": number,      // A reward for completing the goal
            "image": string,        // Find a relevant image URL based on the goal
            "completionDate": string // Date the goal should be completed by
          }
          
          When providing a response:
          - **Do not include the "Challenge" JSON object in the message visible to the user.** 
          - If the user has set a challenge, return the updated "Challenge" object **only to the backend** and **not in the assistant's reply message**. 
          - Keep the assistant's reply friendly and conversational. Focus on engagement, providing helpful responses about finances. 
          - If a challenge was set, **add it to the backend but do not send it in the visible response**.
          - Only include relevant financial advice or information in the visible response to the user, without revealing raw JSON data.
          
          If the user doesn’t want to set up a goal, engage them in a friendly, natural conversation about financial topics. 
          Use a maximum of 2 sentences, add emojis for a friendly tone, and subtly incorporate SunLife branding, such as: 'With SunLife, you've got this! 🌞'.
          `,
        },
        ...conversationHistory,
      ],
    });

    const assistantReply = completion.choices[0].message.content;

    // Extract the structured challenge object from GPT-4's response if it exists
    let challengeUpdate = null;
    const challengeRegex = /{[\s\S]*}/; // Match JSON structure
    const match = assistantReply.match(challengeRegex);
    if (match) {
      try {
        challengeUpdate = JSON.parse(match[0]);
        currentChallenge = challengeUpdate; // Update the current challenge state
      } catch (err) {
        console.error("Failed to parse Challenge object:", err);
      }
    }

    // Append assistant's reply to the conversation history
    conversationHistory.push({ role: "assistant", content: assistantReply });

    // If challengeUpdate exists, insert it into the database
    if (challengeUpdate) {
      console.log("Challenge Update: ", challengeUpdate);
      const result = await client.db("sunlife_chats").collection("chats").insertOne(challengeUpdate);
      console.log(`New challenge created with the following id: ${result.insertedId}`);
    }

    // Respond to the client with the assistant's reply and challenge data (if any)
    res.status(200).json({ reply: assistantReply, challenge: challengeUpdate });
  } catch (error) {
    console.error("Error with GPT-4 API:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
