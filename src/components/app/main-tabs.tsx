
// 'use client';

// import * as React from 'react';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { MapPin, Languages, Bot, Bookmark } from 'lucide-react';
// import { ExplorePage } from '@/components/app/explore-page';
// import { Card } from '../ui/card';
// import { AiTranslator } from './ai-translator';
// import { AiAssistant } from './ai-assistant';
// import type { Message } from './ai-assistant';
// import { SavedItemsTab } from './saved-places-tab';
// import { getAiAssistantResponse } from '@/app/actions';
// import { useToast } from '@/hooks/use-toast';
// import "react-markdown-editor-lite/lib/index.css";

// interface TabContextType {
//     activeTab: string;
//     setActiveTab: (value: string) => void;
//     assistantMessages: Message[];
//     setAssistantMessages: React.Dispatch<React.SetStateAction<Message[]>>;
//     handleAssistantSubmit: (input: string, context?: any) => Promise<void>;
//     isAssistantLoading: boolean;
// }

// const tabContext = React.createContext<TabContextType | null>(null);

// export function useTabContext() {
//     const context = React.useContext(tabContext);
//     if (!context) {
//         throw new Error('useTabContext must be used within a TabProvider');
//     }
//     return context;
// }

// const initialMessages: Message[] = [
//     {
//         id: 'init1',
//         role: 'assistant',
//         content: "I am your AI Travel Assistant. Use the form to generate a detailed travel plan, or ask me a specific question about your destination's culture, history, or logistics!",
//     }
// ];

// function TabProvider({ children }: { children: React.ReactNode }) {
//     const { toast } = useToast();
//     const [activeTab, setActiveTab] = React.useState('assistant');

//     // State for the unified AI Assistant
//     const [assistantMessages, setAssistantMessages] = React.useState<Message[]>(initialMessages);
//     const [isAssistantLoading, setIsAssistantLoading] = React.useState(false);
    
//     const handleAssistantSubmit = async (input: string, context: any = {}) => {
//         const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
//         setAssistantMessages((prev) => [...prev, userMessage]);
//         setIsAssistantLoading(true);

//         const language = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';

//         const result = await getAiAssistantResponse({ 
//             query: input, 
//             language,
//             ...context
//         });

//         setIsAssistantLoading(false);

//         if (result.success && result.data) {
//           const assistantMessage: Message = {
//             id: (Date.now() + 1).toString(),
//             role: 'assistant',
//             content: result.data.answer,
//           };
//           setAssistantMessages((prev) => [...prev, assistantMessage]);
//         } else {
//           toast({
//             variant: 'destructive',
//             title: 'Error',
//             description: result.error,
//           });
//            const errorMessage: Message = {
//               id: (Date.now() + 1).toString(),
//               role: 'assistant',
//               content: `I'm sorry, I encountered an error: ${result.error}`,
//            };
//            setAssistantMessages((prev) => [...prev, errorMessage]);
//         }
//     };
  
//     return (
//         <tabContext.Provider value={{ 
//             activeTab, 
//             setActiveTab,
//             assistantMessages,
//             setAssistantMessages,
//             handleAssistantSubmit,
//             isAssistantLoading
//         }}>
//             {children}
//         </tabContext.Provider>
//     )
// }

// export function MainTabs() {
//     const { activeTab, setActiveTab } = useTabContext();
//     return (
//         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//             <TabsList className="grid w-full grid-cols-4 h-auto bg-transparent rounded-none p-0">
//                 <TabsTrigger value="explore" className="gap-1.5"><MapPin className="h-4 w-4" />Explore</TabsTrigger>
//                 <TabsTrigger value="assistant" className="gap-1.5"><Bot className="h-4 w-4" />AI Assistant</TabsTrigger>
//                 <TabsTrigger value="saved" className="gap-1.5"><Bookmark className="h-4 w-4" />Saved</TabsTrigger>
//                 <TabsTrigger value="translator" className="gap-1.5"><Languages className="h-4 w-4" />Translator</TabsTrigger>
//             </TabsList>
//         </Tabs>
//     );
// }

// export function MainTabsContent() {
//     const { activeTab } = useTabContext();
//     return (
//          <main className="container py-6 flex-grow mb-16 md:mb-0">
//             <Card className="shadow-lg min-h-[calc(100vh-10rem)] h-auto">
//                 <Tabs value={activeTab} className="h-full">
//                     <TabsContent value="explore" className="mt-0 p-0 h-full"><ExplorePage /></TabsContent>
//                     <TabsContent value="assistant" className="mt-0 p-0 h-full"><AiAssistant /></TabsContent>
//                     <TabsContent value="saved" className="mt-0 p-0 h-full"><SavedItemsTab /></TabsContent>
//                     <TabsContent value="translator" className="mt-0 p-0 h-full"><AiTranslator /></TabsContent>
//                 </Tabs>
//             </Card>
//         </main>
//     )
// }

// export function MainTabsWrapper({ children }: { children: React.ReactNode }) {
//   return <TabProvider>{children}</TabProvider>;
// }



'use client';

import * as React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Languages, Bot, Bookmark } from 'lucide-react';
import { ExplorePage } from '@/components/app/explore-page';
import { Card } from '../ui/card';
import { AiTranslator } from './ai-translator';
import { AiAssistant } from './ai-assistant';
import type { Message } from './ai-assistant';
import { SavedItemsTab } from './saved-places-tab';
import { getAiAssistantResponse } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import "react-markdown-editor-lite/lib/index.css";

interface TabContextType {
    activeTab: string;
    setActiveTab: (value: string) => void;
    assistantMessages: Message[];
    setAssistantMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    handleAssistantSubmit: (input: string, context?: any) => Promise<void>;
    isAssistantLoading: boolean;
}

const tabContext = React.createContext<TabContextType | null>(null);

export function useTabContext() {
    const context = React.useContext(tabContext);
    if (!context) {
        throw new Error('useTabContext must be used within a TabProvider');
    }
    return context;
}

const initialMessages: Message[] = [
    {
        id: 'init1',
        role: 'assistant',
        content: "I am your AI Travel Assistant. Use the form to generate a detailed travel plan, or ask me a specific question about your destination's culture, history, or logistics!",
    }
];

function TabProvider({ children }: { children: React.ReactNode }) {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = React.useState('explore');

    // State for the unified AI Assistant
    const [assistantMessages, setAssistantMessages] = React.useState<Message[]>(initialMessages);
    const [isAssistantLoading, setIsAssistantLoading] = React.useState(false);
    
    const handleAssistantSubmit = async (input: string, context: any = {}) => {
        const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
        setAssistantMessages((prev) => [...prev, userMessage]);
        setIsAssistantLoading(true);

        const language = typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : 'en';

        const result = await getAiAssistantResponse({ 
            query: input, 
            language,
            ...context
        });

        setIsAssistantLoading(false);

        if (result.success && result.data) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.data.answer,
          };
          setAssistantMessages((prev) => [...prev, assistantMessage]);
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error,
          });
           const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `I'm sorry, I encountered an error: ${result.error}`,
           };
           setAssistantMessages((prev) => [...prev, errorMessage]);
        }
    };
  
    return (
        <tabContext.Provider value={{ 
            activeTab, 
            setActiveTab,
            assistantMessages,
            setAssistantMessages,
            handleAssistantSubmit,
            isAssistantLoading
        }}>
            {children}
        </tabContext.Provider>
    )
}

export function MainTabs() {
    const { activeTab, setActiveTab } = useTabContext();
    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 h-auto bg-transparent rounded-none p-0">
                <TabsTrigger value="explore" className="gap-1.5"><MapPin className="h-4 w-4" />Explore</TabsTrigger>
                <TabsTrigger value="assistant" className="gap-1.5"><Bot className="h-4 w-4" />AI Assistant</TabsTrigger>
                {/*<TabsTrigger value="saved" className="gap-1.5"><Bookmark className="h-4 w-4" />Saved</TabsTrigger>
                <TabsTrigger value="translator" className="gap-1.5"><Languages className="h-4 w-4" />Translator</TabsTrigger>*/}
            </TabsList>
        </Tabs>
    );
}

export function MainTabsContent() {
    const { activeTab } = useTabContext();
    return (
         <main className="container py-6 flex-grow mb-16 md:mb-0">
            <Card className="shadow-lg min-h-[calc(100vh-10rem)] h-auto">
                <Tabs value={activeTab} className="h-full">
                    <TabsContent value="explore" className="mt-0 p-0 h-full"><ExplorePage /></TabsContent>
                    <TabsContent value="assistant" className="mt-0 p-0 h-full"><AiAssistant /></TabsContent>
                    <TabsContent value="saved" className="mt-0 p-0 h-full"><SavedItemsTab /></TabsContent>
                    <TabsContent value="translator" className="mt-0 p-0 h-full"><AiTranslator /></TabsContent>
                </Tabs>
            </Card>
        </main>
    )
}

export function MainTabsWrapper({ children }: { children: React.ReactNode }) {
  return <TabProvider>{children}</TabProvider>;
}
