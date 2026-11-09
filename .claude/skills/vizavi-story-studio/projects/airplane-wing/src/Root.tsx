import React from "react";
import { Composition, Still } from "remotion";
import { CharacterSheet } from "./CharacterSheet";

export const RemotionRoot: React.FC = () => (
  <>
    <Still id="CharacterSheet" component={CharacterSheet} width={1200} height={2200} />
  </>
);
