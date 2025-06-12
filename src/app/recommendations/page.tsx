"use client";

import React, { useState } from 'react';
import { getItemPairingRecommendations, ItemPairingRecommendationsInput, ItemPairingRecommendationsOutput } from '@/ai/flows/item-pairing-recommendations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function RecommendationsPage() {
  const [itemDescription, setItemDescription] = useState('');
  const [userFeedback, setUserFeedback] = useState('');
  const [popularOpinions, setPopularOpinions] = useState('');
  const [recommendations, setRecommendations] = useState<ItemPairingRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    if (!itemDescription.trim()) {
        setError("Item description is required.");
        setIsLoading(false);
        return;
    }

    const input: ItemPairingRecommendationsInput = {
      itemDescription,
      userFeedback: userFeedback || undefined,
      popularOpinions: popularOpinions || undefined,
    };

    try {
      const result = await getItemPairingRecommendations(input);
      setRecommendations(result);
    } catch (err) {
      console.error("Error getting recommendations:", err);
      setError("Failed to fetch recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <Lightbulb className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold font-headline">Item Pairing Recommendations</h1>
          <p className="text-muted-foreground">Discover items that pair well together with AI.</p>
        </div>
      </div>

      <Card className="shadow-lg mb-8">
        <CardHeader>
          <CardTitle>Describe Your Item</CardTitle>
          <CardDescription>Provide details about the item for which you want pairing recommendations.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="itemDescription" className="block text-sm font-medium mb-1">Item Description*</label>
              <Textarea
                id="itemDescription"
                value={itemDescription}
                onChange={(e) => setItemDescription(e.target.value)}
                placeholder="e.g., A red summer dress, floral pattern, cotton material."
                required
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="userFeedback" className="block text-sm font-medium mb-1">User Feedback (Optional)</label>
              <Input
                id="userFeedback"
                value={userFeedback}
                onChange={(e) => setUserFeedback(e.target.value)}
                placeholder="e.g., Users prefer comfortable and casual pairings."
              />
            </div>
            <div>
              <label htmlFor="popularOpinions" className="block text-sm font-medium mb-1">Popular Opinions (Optional)</label>
              <Input
                id="popularOpinions"
                value={popularOpinions}
                onChange={(e) => setPopularOpinions(e.target.value)}
                placeholder="e.g., Straw hats and sandals are trending with summer dresses."
              />
            </div>
            <Button type="submit" className="w-full md:w-auto" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting Recommendations...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Get Recommendations
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {recommendations && (
        <Card className="shadow-lg animate-in fade-in-50 duration-500">
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
            <CardDescription>Here are some items that might pair well with "{itemDescription.substring(0,30)}{itemDescription.length > 30 ? '...' : ''}":</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold text-lg mb-2">Recommended Pairs:</h4>
              {recommendations.recommendedPairs.length > 0 ? (
                <ul className="list-disc list-inside space-y-1 pl-2">
                  {recommendations.recommendedPairs.map((pair, index) => (
                    <li key={index} className="text-foreground/90">{pair}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No specific pairs recommended based on the input.</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-lg mb-2">Reasoning:</h4>
              <p className="text-foreground/90 whitespace-pre-wrap">{recommendations.reasoning}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AlertTriangleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  )
}
