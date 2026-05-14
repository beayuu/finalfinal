import { NavigationBarSection } from "./sections/NavigationBarSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { CheckCircle2, Mail, MessageSquare } from "lucide-react";

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required"),
  username: z.string().trim().min(1, "Username is required"),
  email: z.string().trim().email("Enter a valid email address"),
  concerns: z.string().trim().min(10, "Please describe your concern (at least 10 characters)"),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const inputClass =
  "h-11 w-full rounded-lg border border-white/20 bg-white/10 px-3 text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#21bcee] focus-visible:ring-offset-0";

export const ContactsPage = (): JSX.Element => {
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { fullName: "", username: "", email: "", concerns: "" },
  });

  const onSubmit = (_values: ContactFormValues) => {
    setSubmitted(true);
    toast({
      title: "Message sent!",
      description: "We'll get back to you as soon as possible.",
    });
    form.reset();
  };

  return (
    <main className="relative min-h-screen w-full overflow-x-hidden bg-black">
      <NavigationBarSection />

      <section className="relative px-4 pb-16 pt-28 sm:px-6" aria-label="Contact form">
        <div className="mx-auto w-full max-w-2xl">

          <header className="mb-10 text-center">
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#052698] via-[#116bf8] to-[#21bcee]">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
            </div>
            <h1
              className="[font-family:'Inter',Helvetica] text-4xl font-bold text-white sm:text-5xl"
              data-testid="text-contacts-title"
            >
              Contact Us
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-white/60">
              Have questions about reef conservation, adoptions, or volunteering? We'd love to hear from you.
            </p>
          </header>

          {submitted ? (
            <div className="flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-12 backdrop-blur-md text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-white">Message Received!</h2>
                <p className="mt-2 text-white/60">Thank you for reaching out. Our team will respond within 24–48 hours.</p>
              </div>
              <Button
                onClick={() => setSubmitted(false)}
                className="bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95"
              >
                Send another message
              </Button>
            </div>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                  data-testid="form-contact"
                >
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Juan dela Cruz" data-testid="input-contact-fullname" className={inputClass} />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white/80">Username</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="reefkeeper" data-testid="input-contact-username" className={inputClass} />
                        </FormControl>
                        <FormMessage className="text-red-400 text-xs" />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="you@example.com" data-testid="input-contact-email" className={inputClass} />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="concerns" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Concerns</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={5}
                          placeholder="Tell us what's on your mind — questions, feedback, partnership ideas, or anything else..."
                          data-testid="input-contact-concerns"
                          className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-white placeholder:text-white/40 focus-visible:ring-2 focus-visible:ring-[#21bcee] focus-visible:ring-offset-0 resize-none"
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-xs" />
                    </FormItem>
                  )} />

                  <Button
                    type="submit"
                    data-testid="button-submit-contact"
                    className="h-12 w-full rounded-xl text-base font-semibold bg-gradient-to-r from-[#052698] via-[#116bf8] to-[#21bcee] text-white hover:opacity-95"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </Form>

              <div className="mt-8 border-t border-white/10 pt-6 text-center">
                <p className="text-sm text-white/40">
                  You can also reach us at{" "}
                  <a href="mailto:hello@adoptareef.org" className="text-[#21bcee] hover:underline">
                    hello@adoptareef.org
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ContactsPage;
