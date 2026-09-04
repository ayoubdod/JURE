import React, { useState } from 'react'
import { TagsInputClear, TagsInputInput, TagsInputItem, TagsInputLabel, TagsInputPrimitiveItemDelete, TagsInputPrimitiveItemText, TagsInputPrimitiveRoot } from '@/components/ui/tags-input';

// Slug validation function
const isValidSlug = (slug: string): boolean => {
    if (!slug) {
        return false;
    }
    
    // Django's slug pattern: lowercase letters, numbers, hyphens, underscores
    // Cannot start or end with hyphen or underscore
    const pattern = /^[a-z0-9]+(?:[_-][a-z0-9]+)*$/;
    return pattern.test(slug);
};

type TagsInputProps = {
    value: string[],
    onChange: (value: string[]) => void
    setError?: (error: string) => void
    error?: string
}

const TagsInput = ({ value, onChange, setError, error }: TagsInputProps) => {
    const [inputValue, setInputValue] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setError?.('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const trimmedValue = inputValue.trim();
            
            if (trimmedValue) {
                if (isValidSlug(trimmedValue)) {
                    if (!value.includes(trimmedValue)) {
                        onChange([...value, trimmedValue]);
                        setInputValue('');
                        setError?.('');
                    } else {
                        setError?.('This slug already exists');
                    }
                } else {
                    setError('Invalid slug format. Use only lowercase letters, numbers, hyphens, and underscores. Cannot start or end with hyphen or underscore.');
                }
            }
        }
    };

    const handleValueChange = (newValue: string[]) => {
        // Filter out any invalid slugs that might have been added programmatically
        const validSlugs = newValue.filter(slug => isValidSlug(slug));
        onChange(validSlugs);
    };

    return (
        <div className="space-y-2">
            <TagsInputPrimitiveRoot className='-mb-4' value={value} onValueChange={handleValueChange}>
                <TagsInputLabel />
                {
                    value.map((tag, index) => (
                        <TagsInputItem key={index} value={tag} >
                            <TagsInputPrimitiveItemText />
                            <TagsInputPrimitiveItemDelete />
                        </TagsInputItem>
                    ))
                }
                <TagsInputInput 
                    placeholder='Enter tag (e.g., my-tag, my_tag, mytag123)' 
                    className='mt-2' 
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                />
                <TagsInputClear />
            </TagsInputPrimitiveRoot>
            {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
        </div>
    )
}

export default TagsInput