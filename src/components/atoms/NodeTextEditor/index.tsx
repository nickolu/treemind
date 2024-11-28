import React, { useState } from 'react';
import { TextField } from "@mui/material";

const NodeTextEditor = ({
    textEditorRef,
    text,
    setText,
    setHtml,
    setIsNodeBeingEdited
}: {
    textEditorRef: React.RefObject<HTMLInputElement>,
    text: string,
    setText: (text: string) => void,
    setHtml: (html: string) => void,
    setIsNodeBeingEdited: (isNodeBeingEdited: boolean) => void
}) => {
    console.log('on text editor render', text);
    const [hasChanged, setHasChanged] = useState(false);

    return <TextField
        autoFocus
        size='small'
        variant='standard'
        value={text}
        inputRef={textEditorRef}
        multiline
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            console.log('onChange')
            setHasChanged(true);
            setText(e.target.value);
        }}
        onFocus={(event: React.FocusEvent<HTMLInputElement>) => {
            setIsNodeBeingEdited(true);
            event.target.select();
        }}
        onBlur={() => {
            setIsNodeBeingEdited(false);
            if (hasChanged) {
                setHtml(text);
                setHasChanged(false);
            }
        }}

    />;
};


export { NodeTextEditor };