/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(222, 47%, 7%)",
        foreground: "hsl(210, 40%, 98%)",
        card: "hsl(217, 33%, 12%)",
        "card-foreground": "hsl(210, 40%, 98%)",
        popover: "hsl(217, 33%, 12%)",
        "popover-foreground": "hsl(210, 40%, 98%)",
        primary: "hsl(199, 89%, 48%)",
        "primary-foreground": "hsl(222, 47%, 11%)",
        secondary: "hsl(217, 19%, 20%)",
        "secondary-foreground": "hsl(210, 40%, 98%)",
        muted: "hsl(217, 19%, 27%)",
        "muted-foreground": "hsl(215, 20%, 65%)",
        accent: "hsl(217, 19%, 27%)",
        "accent-foreground": "hsl(210, 40%, 98%)",
        destructive: "hsl(0, 63%, 51%)",
        "destructive-foreground": "hsl(210, 40%, 98%)",
        border: "hsl(217, 19%, 22%)",
        input: "hsl(217, 19%, 22%)",
        ring: "hsl(199, 89%, 48%)",
      },
      borderRadius: {
        lg: "0.5rem",
        md: "calc(0.5rem - 2px)",
        sm: "calc(0.5rem - 4px)",
      },
    },
  },
  plugins: [],
};
