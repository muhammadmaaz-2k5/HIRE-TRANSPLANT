'use client';

import * as React from 'react';
import { Send, Sparkles, Loader2, Bot, User, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; args: Record<string, unknown> }[];
  toolResults?: { name: string; result: unknown }[];
};

const suggestions = [
  "What's Dr. Sarah Chen's weekly schedule?",
  "Find the next available slot with Dr. Nair",
  "Book me with Dr. Reed next Tuesday at 10am",
  "Show upcoming appointments",
];

const toolIcons: Record<string, typeof Calendar> = {
  checkDoctorAvailability: Calendar,
  getDoctorSchedule: Clock,
  findNextAvailableSlot: Calendar,
  createAppointment: CheckCircle,
  getAppointment: Calendar,
  updateAppointment: Clock,
  cancelAppointment: XCircle,
};

export default function AssistantPage() {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm your AI appointment assistant. I can book, check availability, reschedule, and cancel appointments. How can I help?",
    },
  ]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = async (text: string) => {
    if (!text.trim() || sending) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages((m) => [...m, userMsg]);
    setSending(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })) }),
      });

      if (!res.ok) {
        throw new Error(`Request failed (${res.status})`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.reply ?? 'Sorry, I could not process that.',
          toolCalls: data.toolCalls,
          toolResults: data.toolResults,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: `Sorry, something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again.`,
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Appointment Assistant
        </h1>
        <p className="text-sm text-muted-foreground">
          Book, check availability, reschedule, and cancel appointments through natural conversation.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat */}
        <Card className="flex h-[600px] flex-col border-border/60 lg:col-span-2">
          <CardHeader className="border-b border-border/60 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Assistant</CardTitle>
                <CardDescription className="text-xs">Powered by tool-calling AI</CardDescription>
              </div>
              <Badge variant="outline" className="ml-auto border-chart-2/30 bg-chart-2/10 text-chart-2">
                <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-chart-2" />
                Online
              </Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    m.role === 'assistant' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </div>
                <div className={cn('max-w-[80%] space-y-2', m.role === 'user' && 'text-right')}>
                  <div
                    className={cn(
                      'inline-block whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm',
                      m.role === 'assistant'
                        ? 'rounded-tl-sm bg-muted/60 text-foreground'
                        : 'rounded-tr-sm bg-primary text-primary-foreground'
                    )}
                  >
                    {m.content}
                  </div>
                  {m.toolCalls && m.toolCalls.length > 0 && (
                    <div className="space-y-1.5 text-left">
                      {m.toolCalls.map((tc, j) => {
                        const Icon = toolIcons[tc.name] ?? Sparkles;
                        return (
                          <div
                            key={j}
                            className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary"
                          >
                            <Icon className="h-3 w-3" />
                            <span className="font-mono">{tc.name}</span>
                            <span className="text-muted-foreground">
                              {Object.entries(tc.args)
                                .filter(([, v]) => v)
                                .map(([k, v]) => `${k}=${String(v)}`)
                                .join(', ')}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted/60 px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Thinking…</span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border/60 p-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Ask the assistant to book, check, or cancel…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
                className="border-border/60 bg-muted/40"
              />
              <Button type="submit" size="icon" disabled={sending || !input.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </Card>

        {/* Suggestions + tools */}
        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Try asking</CardTitle>
              <CardDescription>Example prompts to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={sending}
                  className="w-full rounded-lg border border-border/60 bg-card px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 hover:text-foreground disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Available tools</CardTitle>
              <CardDescription>The assistant can call these functions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'checkDoctorAvailability', desc: 'Find upcoming slots' },
                { name: 'getDoctorSchedule', desc: 'Weekly recurring hours' },
                { name: 'findNextAvailableSlot', desc: 'Earliest free slot' },
                { name: 'createAppointment', desc: 'Book a new visit' },
                { name: 'getAppointment', desc: 'Look up bookings' },
                { name: 'updateAppointment', desc: 'Reschedule a visit' },
                { name: 'cancelAppointment', desc: 'Cancel a booking' },
              ].map((t) => {
                const Icon = toolIcons[t.name] ?? Sparkles;
                return (
                  <div key={t.name} className="flex items-center gap-2.5 rounded-md px-1 py-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-medium">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
