"use client";

import React, { useState } from "react";
import {
  AppendMessage,
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { v4 as uuidv4 } from "uuid";
import { MyThread } from "./Primitives";
import { useExternalMessageConverter } from "@assistant-ui/react";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";
import {
  convertLangchainMessages,
  convertToOpenAIFormat,
} from "@/lib/convert_messages";
import { GraphInput } from "@/hooks/useGraph";
import { Toaster } from "./ui/toaster";
import { Artifact } from "@/types";
import { Thread } from "@langchain/langgraph-sdk";
export interface ContentComposerChatInterfaceProps {
  messages: BaseMessage[];
  streamMessage: (input: GraphInput) => Promise<void>;
  setMessages: React.Dispatch<React.SetStateAction<BaseMessage[]>>;
  setArtifacts: React.Dispatch<React.SetStateAction<Artifact[]>>;
  setSelectedArtifact: (artifactId: string) => void;
  createThread: () => Promise<Thread>;
}

const realNewline = `
`;

export function ContentComposerChatInterface(
  props: ContentComposerChatInterfaceProps
): React.ReactElement {
  const { messages, setMessages, streamMessage } = props;
  const [isRunning, setIsRunning] = useState(false);

  async function onNew(message: AppendMessage): Promise<void> {
    if (message.content[0]?.type !== "text") {
      throw new Error("Only text messages are supported");
    }
    setIsRunning(true);

    try {
      const humanMessage = new HumanMessage({
        content: message.content[0].text,
        id: uuidv4(),
      });

      setMessages((prevMessages) => [...prevMessages, humanMessage]);

      await streamMessage({
        messages: [convertToOpenAIFormat(humanMessage)],
      });
    } catch (error) {
      console.error("Error running message:", error);
    } finally {
      setIsRunning(false);
    }
  }

  const threadMessages = useExternalMessageConverter<BaseMessage>({
    callback: convertLangchainMessages,
    messages: messages,
    isRunning,
  });

  const runtime = useExternalStoreRuntime({
    messages: threadMessages,
    isRunning,
    onNew,
  });

  return (
    <div className="h-full">
      <AssistantRuntimeProvider runtime={runtime}>
        <MyThread
          createThread={props.createThread}
          setSelectedArtifact={props.setSelectedArtifact}
        />
      </AssistantRuntimeProvider>
      <Toaster />
    </div>
  );
}
