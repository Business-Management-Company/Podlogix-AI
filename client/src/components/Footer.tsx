import { useCreateSubscriber, useCreateMessage } from "@/hooks/use-subscribers";
import { useCreateMessage as useCreateMsg } from "@/hooks/use-messages"; // Correct import usage
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertMessageSchema, insertSubscriberSchema, type InsertMessage, type InsertSubscriber } from "@shared/schema";
import { Loader2, Mail, Twitter, Linkedin, Github, Send } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function Footer() {
  const [open, setOpen] = useState(false);
  const createSubscriber = useCreateSubscriber();
  const createMessage = useCreateMsg();

  // Subscriber Form
  const subForm = useForm<InsertSubscriber>({
    resolver: zodResolver(insertSubscriberSchema),
    defaultValues: { email: "" },
  });

  const onSubscribe = (data: InsertSubscriber) => {
    createSubscriber.mutate(data, {
      onSuccess: () => subForm.reset(),
    });
  };

  // Contact Form
  const contactForm = useForm<InsertMessage>({
    resolver: zodResolver(insertMessageSchema),
    defaultValues: { name: "", email: "", message: "" },
  });

  const onContact = (data: InsertMessage) => {
    createMessage.mutate(data, {
      onSuccess: () => {
        contactForm.reset();
        setOpen(false);
      },
    });
  };

  return (
    <footer id="footer" className="bg-card border-t border-white/5 pt-20 pb-10">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 mb-16">
          
          {/* CTA Section */}
          <div>
            <h2 className="text-3xl font-display font-bold mb-4">Ready to <span className="text-gradient-primary">level up?</span></h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-md">
              Join 5,000+ podcasters using AI to grow their audience faster. Get early access today.
            </p>
            
            <Form {...subForm}>
              <form onSubmit={subForm.handleSubmit(onSubscribe)} className="flex gap-4 max-w-md">
                <FormField
                  control={subForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input 
                          placeholder="Enter your email" 
                          className="bg-background/50 border-white/10 h-12 rounded-xl focus-visible:ring-primary/50" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  size="lg"
                  disabled={createSubscriber.isPending}
                  className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25"
                >
                  {createSubscriber.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Join Waitlist"}
                </Button>
              </form>
            </Form>
          </div>

          {/* Contact & Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-4 text-foreground">Product</h3>
              <ul className="space-y-3">
                <li><a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-foreground">Company</h3>
              <ul className="space-y-3">
                <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</a></li>
                <li>
                  <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                      <button className="text-muted-foreground hover:text-primary transition-colors text-left">Contact Us</button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-card border-white/10">
                      <DialogHeader>
                        <DialogTitle>Get in touch</DialogTitle>
                        <DialogDescription>
                          Have a question or feedback? We'd love to hear from you.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...contactForm}>
                        <form onSubmit={contactForm.handleSubmit(onContact)} className="space-y-4 mt-4">
                          <FormField
                            control={contactForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="John Doe" className="bg-background/50 border-white/10" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contactForm.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input placeholder="john@example.com" className="bg-background/50 border-white/10" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={contactForm.control}
                            name="message"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Message</FormLabel>
                                <FormControl>
                                  <Textarea placeholder="How can we help?" className="bg-background/50 border-white/10 min-h-[100px]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button 
                            type="submit" 
                            className="w-full bg-primary hover:bg-primary/90"
                            disabled={createMessage.isPending}
                          >
                            {createMessage.isPending ? "Sending..." : "Send Message"}
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </li>
                <li><a href="/privacy" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-privacy">Privacy Policy</a></li>
                <li><a href="/terms" className="text-muted-foreground hover:text-primary transition-colors" data-testid="link-terms">Terms & Conditions</a></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">© 2026 Podlogix Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-muted-foreground hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
            <a href="#" className="text-muted-foreground hover:text-white transition-colors"><Linkedin className="w-5 h-5" /></a>
            <a href="#" className="text-muted-foreground hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
