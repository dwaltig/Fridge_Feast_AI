
import React, { useState, useRef, useCallback } from 'react';
import type { Chat } from '@google/genai';
import { analyzeImageForIngredients, getMealSuggestions, getChatResponse, generateImage } from './services/geminiService';
import type { Meal, ChatMessage } from './types';
import { IconCamera, IconSparkles, IconChat, IconFridge, IconChefHat, IconPicture } from './components/Icons';
import { Spinner } from './components/Spinner';

type AppView = 'suggester' | 'chat' | 'image';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('suggester');
    const chatRef = useRef<Chat | null>(null);

    return (
        <div className="min-h-screen font-sans flex flex-col">
            <header className="bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <IconFridge className="w-8 h-8 text-orange-500" />
                        <h1 className="text-xl md:text-2xl font-bold text-stone-800">Fridge Feast AI</h1>
                    </div>
                </div>
            </header>

            <main className="flex-grow container mx-auto p-4">
                <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8">
                    <div className="mb-6 border-b border-stone-200">
                        <nav className="-mb-px flex space-x-4 sm:space-x-6" aria-label="Tabs">
                            <TabButton<AppView> currentView={view} view="suggester" setView={setView} icon={<IconChefHat className="w-5 h-5" />} label="Meal Ideas" />
                            <TabButton<AppView> currentView={view} view="chat" setView={setView} icon={<IconChat className="w-5 h-5" />} label="Chat Bot" />
                            <TabButton<AppView> currentView={view} view="image" setView={setView} icon={<IconPicture className="w-5 h-5" />} label="Image Fun" />
                        </nav>
                    </div>

                    {view === 'suggester' && <MealSuggester />}
                    {view === 'chat' && <ChatBot chatRef={chatRef} />}
                    {view === 'image' && <ImageGenerator />}
                </div>
            </main>
            
            <footer className="text-center p-4 text-stone-500 text-sm">
                <p>&copy; {new Date().getFullYear()} Fridge Feast AI. Powered by Gemini.</p>
            </footer>
        </div>
    );
};

interface TabButtonProps<T extends string> {
    currentView: T;
    view: T;
    setView: (view: T) => void;
    icon: React.ReactNode;
    label: string;
}

const TabButton = <T extends string,>({ currentView, view, setView, icon, label }: TabButtonProps<T>) => (
    <button
        onClick={() => setView(view)}
        className={`inline-flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors duration-200 ease-in-out
            ${currentView === view
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
            }`}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

const MealSuggester: React.FC = () => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [meals, setMeals] = useState<Meal[]>([]);
    const [ingredients, setIngredients] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setImageFile(file);
            setSelectedImage(URL.createObjectURL(file));
            setMeals([]);
            setIngredients('');
            setError(null);
        }
    };

    const handleAnalyze = async () => {
        if (!imageFile) {
            setError('Please select an image first.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setMeals([]);
        setIngredients('');

        try {
            const identifiedIngredients = await analyzeImageForIngredients(imageFile);
            setIngredients(identifiedIngredients);

            const suggestedMeals = await getMealSuggestions(identifiedIngredients);
            setMeals(suggestedMeals);
        } catch (err) {
            console.error(err);
            setError('Failed to get meal suggestions. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-stone-700">What's in your fridge?</h2>
                <p className="text-stone-500 mt-1">Upload a photo of your fridge or pantry to get instant meal ideas!</p>
            </div>
            <div className="max-w-xl mx-auto">
                <div className={`relative border-2 border-dashed rounded-lg p-6 text-center ${!selectedImage ? 'border-stone-300 hover:border-orange-400 transition-colors' : 'border-orange-300'}`}>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    {selectedImage ? (
                        <img src={selectedImage} alt="Selected" className="mx-auto max-h-64 rounded-lg shadow-md" />
                    ) : (
                        <div className="flex flex-col items-center justify-center space-y-2 text-stone-500">
                            <IconCamera className="w-12 h-12" />
                            <p className="font-semibold">Click to upload an image</p>
                            <p className="text-xs">PNG, JPG, or WEBP</p>
                        </div>
                    )}
                </div>
            </div>

            {selectedImage && (
                <div className="text-center">
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-all disabled:bg-stone-400 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Spinner /> : <IconSparkles className="w-5 h-5" />}
                        {isLoading ? 'Analyzing...' : 'Get Meal Ideas'}
                    </button>
                </div>
            )}
            
            {error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-lg">{error}</div>}

            {isLoading && (
                 <div className="flex flex-col items-center justify-center text-stone-600 space-y-4 py-8">
                     <Spinner />
                     <p className="animate-pulse">Thinking of delicious meals...</p>
                 </div>
            )}
            
            {ingredients && !isLoading && (
                <div className="bg-stone-100 p-4 rounded-lg">
                    <h3 className="font-bold text-stone-700">Identified Ingredients:</h3>
                    <p className="text-stone-600 text-sm mt-1">{ingredients}</p>
                </div>
            )}

            {meals.length > 0 && !isLoading && (
                <div className="space-y-4">
                    <h3 className="text-xl font-bold text-center text-stone-700">Here are your meal ideas!</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {meals.map((meal) => (
                            <div key={meal.name} className="bg-white border border-stone-200 rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-orange-300 transition-all">
                                <h4 className="font-bold text-orange-700">{meal.name}</h4>
                                <p className="text-sm text-stone-600 my-2">{meal.description}</p>
                                <p className="text-xs font-semibold text-stone-500">You'll need:</p>
                                <ul className="list-disc list-inside text-sm text-stone-600 mt-1">
                                    {meal.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


const ChatBot: React.FC<{ chatRef: React.MutableRefObject<Chat | null> }> = ({ chatRef }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', content: "Hello! I'm your culinary assistant. Ask me anything about recipes or cooking!" }
    ]);
    const [userInput, setUserInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    React.useEffect(scrollToBottom, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isThinking) return;

        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userInput }];
        setMessages(newMessages);
        setUserInput('');
        setIsThinking(true);

        try {
            const responseText = await getChatResponse(chatRef, newMessages);
            setMessages(prev => [...prev, { role: 'model', content: responseText }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, I'm having trouble connecting. Please try again." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-[60vh]">
            <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0"><IconChefHat className="w-5 h-5"/></div>}
                        <div className={`p-3 rounded-xl max-w-lg ${msg.role === 'user' ? 'bg-orange-500 text-white rounded-br-none' : 'bg-stone-100 text-stone-800 rounded-bl-none'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex items-start gap-2.5 justify-start">
                         <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white flex-shrink-0"><IconChefHat className="w-5 h-5"/></div>
                         <div className="p-3 rounded-xl bg-stone-100 text-stone-800 rounded-bl-none flex items-center space-x-2">
                             <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse delay-0"></div>
                             <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse delay-200"></div>
                             <div className="w-2 h-2 bg-stone-400 rounded-full animate-pulse delay-400"></div>
                         </div>
                    </div>
                )}
                 <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Ask about a recipe..."
                    className="flex-grow p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none transition"
                    disabled={isThinking}
                />
                <button type="submit" disabled={isThinking || !userInput.trim()} className="px-5 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition disabled:bg-stone-400 disabled:cursor-not-allowed">
                    Send
                </button>
            </form>
        </div>
    );
};

const ImageGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt.');
            return;
        }
        setIsGenerating(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const imageUrl = await generateImage(prompt);
            setGeneratedImage(imageUrl);
        } catch (err) {
            console.error(err);
            setError('Failed to generate image. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <div className="space-y-6">
             <div className="text-center">
                <h2 className="text-2xl font-bold text-stone-700">AI Image Generator</h2>
                <p className="text-stone-500 mt-1">Describe an image and let AI bring it to life!</p>
            </div>
             <div className="max-w-xl mx-auto space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., A gourmet pizza shaped like a heart, on a wooden table"
                    rows={3}
                    className="w-full p-3 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none transition"
                    disabled={isGenerating}
                />
                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-all disabled:bg-stone-400 disabled:cursor-not-allowed"
                >
                    {isGenerating ? <Spinner /> : <IconSparkles className="w-5 h-5" />}
                    {isGenerating ? 'Generating...' : 'Generate Image'}
                </button>
             </div>
             {error && <div className="text-center text-red-500 bg-red-100 p-3 rounded-lg max-w-xl mx-auto">{error}</div>}

             {isGenerating && (
                <div className="flex flex-col items-center justify-center text-stone-600 space-y-4 py-8">
                     <Spinner />
                     <p className="animate-pulse">Creating your masterpiece...</p>
                 </div>
             )}

            {generatedImage && !isGenerating && (
                <div className="mt-6">
                    <h3 className="text-lg font-bold text-center text-stone-700 mb-4">Your Generated Image:</h3>
                    <div className="flex justify-center">
                         <img src={generatedImage} alt={prompt} className="rounded-lg shadow-xl max-w-full h-auto md:max-w-md lg:max-w-lg" />
                    </div>
                </div>
            )}
        </div>
    );
};


export default App;