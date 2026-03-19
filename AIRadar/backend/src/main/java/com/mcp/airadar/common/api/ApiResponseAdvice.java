package com.mcp.airadar.common.api;

import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.converter.StringHttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@ControllerAdvice
public class ApiResponseAdvice implements ResponseBodyAdvice<Object> {

    @Override
    public boolean supports(MethodParameter returnType, Class<? extends HttpMessageConverter<?>> converterType) {
        return true;
    }

    @Override
    public Object beforeBodyWrite(
            Object body,
            MethodParameter returnType,
            MediaType selectedContentType,
            Class<? extends HttpMessageConverter<?>> selectedConverterType,
            ServerHttpRequest request,
            ServerHttpResponse response
    ) {
        if (body == null || body instanceof ApiSuccessResponse<?> || body instanceof ApiErrorResponse) {
            return body;
        }

        if (response instanceof ServletServerHttpResponse servletResponse
                && servletResponse.getServletResponse().getStatus() == 204) {
            return body;
        }

        if (StringHttpMessageConverter.class.isAssignableFrom(selectedConverterType)) {
            throw new IllegalStateException("String response is not supported by ApiResponseAdvice");
        }

        return ApiSuccessResponse.of(request.getURI().getPath(), body);
    }
}
