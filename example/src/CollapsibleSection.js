import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
const CollapsibleSection = ({ title, children, defaultExpanded = true, }) => {
    const [expanded, setExpanded] = React.useState(defaultExpanded);
    return (React.createElement(View, { style: sectionStyles.section },
        React.createElement(Pressable, { onPress: () => setExpanded(e => !e), style: sectionStyles.header },
            React.createElement(Text, { style: sectionStyles.title }, title),
            React.createElement(Text, { style: sectionStyles.arrow }, expanded ? '▲' : '▼')),
        expanded && React.createElement(View, { style: sectionStyles.body }, children)));
};
const sectionStyles = StyleSheet.create({
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a2e',
    },
    arrow: {
        fontSize: 11,
        color: '#888',
    },
    body: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
});
export default CollapsibleSection;
