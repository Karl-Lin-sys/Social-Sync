import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { GeneratedContent, Platform } from '../types';
import { Loader2, Sparkles, Image as ImageIcon, Copy, Check, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TONES = ['Professional', 'Witty', 'Urgent', 'Educational', 'Inspirational', 'Casual'];
const IMAGE_SIZES = ['1K', '2K', '4K'];
const ASPECT_RATIOS = ['Auto', '1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'];

export function ContentGenerator() {
  const [idea, setIdea] = useState('');
  const [tone, setTone] = useState('Professional');
  const [imageSize, setImageSize] = useState('1K');
  const [aspectRatio, setAspectRatio] = useState('Auto');
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [content, setContent] = useState<GeneratedContent | null>(null);
  const [activeTab, setActiveTab] = useState<Platform>('linkedin');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!idea.trim()) return;
    
    setIsGeneratingText(true);
    setError(null);
    setContent(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: `Generate social media posts for the following idea: "${idea}". The tone should be ${tone}.
        
        Provide content for:
        1. LinkedIn (long-form, professional but matching the tone)
        2. Twitter (short, punchy, under 280 characters, matching the tone)
        3. Instagram (visual-focused, engaging caption with hashtags, matching the tone)
        
        Also, provide a highly detailed, descriptive image generation prompt for each platform that perfectly complements the post. The image prompt should be self-contained and describe the visual scene, style, lighting, and mood.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              linkedin: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["text", "imagePrompt"]
              },
              twitter: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["text", "imagePrompt"]
              },
              instagram: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING }
                },
                required: ["text", "imagePrompt"]
              }
            },
            required: ["linkedin", "twitter", "instagram"]
          }
        }
      });

      const generatedText = response.text;
      if (!generatedText) throw new Error("No text generated");
      
      const parsedContent = JSON.parse(generatedText) as GeneratedContent;
      
      // Initialize image loading states
      parsedContent.linkedin.loadingImage = true;
      parsedContent.twitter.loadingImage = true;
      parsedContent.instagram.loadingImage = true;
      
      setContent(parsedContent);
      setIsGeneratingText(false);

      // Kick off image generation in parallel
      generateImageForPlatform('linkedin', parsedContent.linkedin.imagePrompt, aspectRatio === 'Auto' ? '16:9' : aspectRatio, imageSize);
      generateImageForPlatform('twitter', parsedContent.twitter.imagePrompt, aspectRatio === 'Auto' ? '16:9' : aspectRatio, imageSize);
      generateImageForPlatform('instagram', parsedContent.instagram.imagePrompt, aspectRatio === 'Auto' ? '1:1' : aspectRatio, imageSize);

    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        // Need to re-auth
        if (window.aistudio?.openSelectKey) {
           await window.aistudio.openSelectKey();
           setError("API Key was invalid or expired. Please try generating again.");
        } else {
           setError(err.message || "An error occurred during generation.");
        }
      } else {
        setError(err.message || "An error occurred during generation.");
      }
      setIsGeneratingText(false);
    }
  };

  const generateImageForPlatform = async (platform: Platform, prompt: string, aspectRatio: string, size: string) => {
    try {
      // Create a fresh instance right before the call as instructed
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: prompt,
        config: {
          imageConfig: {
            aspectRatio: aspectRatio,
            imageSize: size
          }
        }
      });
      
      let imageUrl = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          break;
        }
      }
      
      if (!imageUrl) throw new Error("No image data returned");

      setContent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [platform]: {
            ...prev[platform],
            imageUrl,
            loadingImage: false
          }
        };
      });

    } catch (err: any) {
      console.error(`Error generating image for ${platform}:`, err);
      
      // Handle API key error specifically
      if (err.message?.includes("Requested entity was not found")) {
         if (window.aistudio?.openSelectKey) {
            await window.aistudio.openSelectKey();
         }
      }
      
      setContent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          [platform]: {
            ...prev[platform],
            loadingImage: false,
            error: err.message || "Failed to generate image"
          }
        };
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-gray-900 flex flex-col md:flex-row">
      {/* Left Sidebar - Controls */}
      <div className="w-full md:w-[400px] bg-white border-r border-gray-200 p-6 md:p-8 flex flex-col md:h-screen sticky top-0 overflow-y-auto shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-gray-900 text-white rounded-xl flex items-center justify-center">
            <Sparkles size={20} />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Social Sync</h1>
        </div>

        <div className="space-y-6 flex-grow">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">What's your idea?</label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="e.g., We just launched a new AI feature that helps developers write code 10x faster..."
              className="w-full h-32 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tone of Voice</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    tone === t 
                      ? 'bg-gray-900 text-white border-gray-900' 
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Image Quality</label>
            <div className="flex gap-2">
              {IMAGE_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => setImageSize(s)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    imageSize === s 
                      ? 'bg-gray-100 text-gray-900 border-gray-300 font-medium' 
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Higher quality takes longer to generate.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition-all bg-white text-gray-700 text-sm"
            >
              {ASPECT_RATIOS.map(ar => (
                <option key={ar} value={ar}>{ar === 'Auto' ? 'Auto (Platform Optimized)' : ar}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={handleGenerate}
            disabled={isGeneratingText || !idea.trim()}
            className="w-full bg-gray-900 text-white font-medium py-3.5 px-4 rounded-xl hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isGeneratingText ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Drafting Content...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Generate Posts
              </>
            )}
          </button>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Right Content Area - Results */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto md:h-screen">
        {!content && !isGeneratingText ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ImageIcon size={32} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">Your generated content will appear here</p>
            <p className="text-sm mt-2">Enter an idea and click generate to get started.</p>
          </div>
        ) : isGeneratingText ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-gray-900 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="mt-6 text-gray-500 font-medium animate-pulse">Analyzing idea and crafting posts...</p>
          </div>
        ) : content ? (
          <div className="max-w-4xl mx-auto">
            {/* Tabs */}
            <div className="flex gap-2 mb-8 p-1 bg-gray-200/50 rounded-xl w-fit">
              {(['linkedin', 'twitter', 'instagram'] as Platform[]).map((platform) => (
                <button
                  key={platform}
                  onClick={() => setActiveTab(platform)}
                  className={`px-6 py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${
                    activeTab === platform
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>

            {/* Content Display */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2">
                  {/* Image Section */}
                  <div className="bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-100 p-6 flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <ImageIcon size={16} />
                      Generated Visual
                    </h3>
                    
                    <div className="flex-1 flex items-center justify-center min-h-[300px]">
                      {content[activeTab].loadingImage ? (
                        <div className="flex flex-col items-center text-gray-400">
                          <Loader2 size={32} className="animate-spin mb-4" />
                          <p className="text-sm">Generating {imageSize} image...</p>
                        </div>
                      ) : content[activeTab].error ? (
                        <div className="text-center p-6 bg-red-50 rounded-xl text-red-600">
                          <AlertCircle size={24} className="mx-auto mb-2" />
                          <p className="text-sm">{content[activeTab].error}</p>
                        </div>
                      ) : content[activeTab].imageUrl ? (
                        <img 
                          src={content[activeTab].imageUrl} 
                          alt={`Generated for ${activeTab}`} 
                          className="w-full h-auto rounded-lg shadow-sm object-contain max-h-[500px]"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Image Prompt Used</p>
                      <p className="text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100 italic">
                        {content[activeTab].imagePrompt}
                      </p>
                    </div>
                  </div>

                  {/* Text Section */}
                  <div className="p-6 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
                        Post Copy
                      </h3>
                      <CopyButton text={content[activeTab].text} />
                    </div>
                    
                    <div className="flex-1 bg-gray-50 rounded-xl p-5 border border-gray-100 overflow-y-auto max-h-[600px]">
                      <p className="text-gray-800 whitespace-pre-wrap leading-relaxed text-[15px]">
                        {content[activeTab].text}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white border border-gray-200 px-2.5 py-1.5 rounded-md shadow-sm"
    >
      {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
