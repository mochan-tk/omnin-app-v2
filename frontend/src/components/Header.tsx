import Image from "next/image";
import type React from "react";

export default function Header(): React.ReactElement {
	return (
		<header className="bg-card border-b px-6 py-4 shadow-sm z-10 fixed top-0 left-0 right-0">
			<div className="flex items-center gap-3">
				<Image
					src="/Ominicore-icon.png"
					alt="Ominicore"
					width={160}
					height={40}
					className="h-10 rounded-xl"
				/>
				<div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground"></div>
			</div>
		</header>
	);
}
