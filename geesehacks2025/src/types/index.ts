import { MouseEventHandler } from "react";

export interface ChallengeCardProps {
    title: string;
    description: string;
    imgSrc: string;
    deadline: number;
    onClick: MouseEventHandler;
}

export interface MessageProps {
    message: string;
}

